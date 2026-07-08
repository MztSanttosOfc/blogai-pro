import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { makeSummary, htmlToPlainText } from "@/lib/sanitize-text";

// ---- Public-facing types (no correct answers leak to the client) ----------

export interface RewardConfig {
  enabled: boolean;
  content_source: "official" | "manual";
  blog_url: string;
  auto_approve: boolean;
  credits_per_article: number;
  daily_credit_limit: number;
  daily_mission_limit: number;
  min_scroll_percent: number;
  seconds_per_100_words: number;
  pass_threshold: number;
  credits_by_difficulty: Record<string, number>;
  credits_by_category: Record<string, number>;
  eligible_categories: string[];
  today_credits: number;
  today_missions: number;
}

export interface RewardMission {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  difficulty: string;
  word_count: number;
  estimated_read_seconds: number;
  credits: number;
  url: string;
  published_at: string | null;
  completed: boolean;
}

export interface QuizQuestionPublic {
  id: number;
  question: string;
  options: string[];
}

export interface MissionReader {
  missionId: string;
  title: string;
  content: string;
  url: string;
  wordCount: number;
  estimatedReadSeconds: number;
  minScrollPercent: number;
  credits: number;
  questions: QuizQuestionPublic[];
}

interface StoredQuestion {
  question: string;
  options: string[];
  correct: number;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---- Player-facing server functions ---------------------------------------

/** Config + approved missions (with per-user completion flag). */
export const getRewardData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [{ data: config }, { data: missions }] = await Promise.all([
      supabase.rpc("reward_config"),
      supabase.rpc("reward_list_missions"),
    ]);
    // Defensive: guarantee no raw HTML/entities ever reach a mission card,
    // even for rows imported before the clean-summary pipeline existed.
    const cleanMissions = ((missions ?? []) as unknown as RewardMission[]).map((m) => ({
      ...m,
      title: htmlToPlainText(m.title) || m.title,
      excerpt: makeSummary(m.excerpt),
    }));
    return {
      config: (config ?? null) as RewardConfig | null,
      missions: cleanMissions,
    };
  });

const MissionIdInput = z.object({ missionId: z.string().uuid() });

const ProbeInput = z.object({ url: z.string().url().max(500) });

export interface EmbedProbe {
  embeddable: boolean;
  reason?: "x-frame-options" | "csp-frame-ancestors" | "fetch-failed";
}

/**
 * Server-side probe that inspects the article's response headers to decide
 * whether it can be safely embedded in an <iframe>. This is more reliable and
 * future-proof than guessing from client-side iframe load events (a blocked
 * frame may still fire `load` on the error page). The client uses the result
 * to pick the iframe strategy or fall back to a popup / native browser.
 */
export const probeEmbeddable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ProbeInput.parse(input))
  .handler(async ({ data }): Promise<EmbedProbe> => {
    const { assertPublicHttpUrl } = await import("./ssrf-guard");
    let target: URL;
    try {
      target = assertPublicHttpUrl(data.url);
    } catch {
      return { embeddable: false, reason: "fetch-failed" };
    }

    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 6000);
      let res: Response;
      try {
        res = await fetch(target.toString(), {
          method: "GET",
          redirect: "follow",
          headers: {
            "user-agent": "Mozilla/5.0 (compatible; BlogAIProBot/1.0)",
            accept: "text/html",
          },
          signal: ctrl.signal,
        });
      } finally {
        clearTimeout(timer);
      }

      const xfo = (res.headers.get("x-frame-options") || "").toLowerCase();
      if (xfo.includes("deny") || xfo.includes("sameorigin")) {
        return { embeddable: false, reason: "x-frame-options" };
      }

      const csp = (res.headers.get("content-security-policy") || "").toLowerCase();
      const fa = csp.match(/frame-ancestors([^;]*)/);
      if (fa) {
        const val = fa[1].trim();
        // 'none'/'self' block cross-origin embedding; a bare directive with no
        // wildcard/scheme host also effectively blocks us.
        if (/'none'|'self'/.test(val) || !/\*|https?:\/\//.test(val)) {
          return { embeddable: false, reason: "csp-frame-ancestors" };
        }
      }

      return { embeddable: true };
    } catch {
      // Network/timeout: don't confirm blocking — assume embeddable and let the
      // client fall back automatically if the iframe never loads.
      return { embeddable: true, reason: "fetch-failed" };
    }
  });

/**
 * Open a mission for reading: returns the article text plus an adaptive quiz
 * (generated and cached on first access). Correct answers are NEVER returned.
 */
export const openMission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => MissionIdInput.parse(input))
  .handler(async ({ data, context }): Promise<MissionReader> => {
    const { supabase } = context;

    const [{ data: missionRaw }, { data: configRaw }] = await Promise.all([
      supabase.rpc("reward_get_mission", { p_id: data.missionId }),
      supabase.rpc("reward_config"),
    ]);
    const mission = missionRaw as Record<string, unknown> | null;
    const config = configRaw as RewardConfig | null;
    if (!mission) throw new Error("Missão não encontrada ou indisponível.");
    if (!config?.enabled) throw new Error("A Central de Recompensas está desativada.");

    const content = String(mission.content ?? "");
    const title = String(mission.title ?? "Artigo");
    const wordCount = Number(mission.word_count ?? 0);

    // Reuse a cached quiz or generate one and persist it.
    let stored: StoredQuestion[] | null = null;
    if (mission.quiz && Array.isArray(mission.quiz)) {
      stored = mission.quiz as unknown as StoredQuestion[];
    }
    if (!stored || stored.length === 0) {
      const apiKey = process.env.LOVABLE_API_KEY;
      if (!apiKey) throw new Error("Serviço de IA indisponível no momento.");
      const { generateQuiz } = await import("./rewards.server");
      stored = await generateQuiz(apiKey, title, content, wordCount);
      await supabase.rpc("reward_save_quiz", {
        p_id: data.missionId,
        p_quiz: stored as unknown as never,
      });
    }

    // Deliver questions shuffled (questions + options) without correct indexes.
    const questions: QuizQuestionPublic[] = shuffle(
      stored.map((q, idx) => ({
        id: idx,
        question: q.question,
        options: shuffle(q.options),
      })),
    );

    return {
      missionId: data.missionId,
      title,
      content,
      url: String(mission.url ?? ""),
      wordCount,
      estimatedReadSeconds: Number(mission.estimated_read_seconds ?? 60),
      minScrollPercent: config.min_scroll_percent,
      credits: Number(mission.credits ?? 0),
      questions,
    };
  });

export interface ReaderModeContent {
  title: string;
  html: string;
  url: string;
}

/**
 * Reader Mode (third fallback): fetch the article and return a SANITIZED HTML
 * fragment so the mission still works when the blog blocks iframe embedding and
 * no native/system browser is available. Preserves headings, paragraphs, lists
 * and images; strips all scripts and unsafe attributes.
 */
export const getMissionReaderMode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => MissionIdInput.parse(input))
  .handler(async ({ data, context }): Promise<ReaderModeContent> => {
    const { supabase } = context;
    const { data: missionRaw } = await supabase.rpc("reward_get_mission", {
      p_id: data.missionId,
    });
    const mission = missionRaw as Record<string, unknown> | null;
    if (!mission) throw new Error("Missão não encontrada ou indisponível.");
    const url = String(mission.url ?? "");

    const { fetchReaderHtml } = await import("./rewards.server");
    const reader = url ? await fetchReaderHtml(url) : null;
    if (reader) return { title: reader.title, html: reader.html, url };

    // Last-resort: render the stored plain-text content as paragraphs so the
    // mission never dead-ends even if the live page can't be re-fetched.
    const text = String(mission.content ?? "");
    const paragraphs = text
      .split(/\n{2,}|(?<=\.)\s{2,}/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `<p>${p.replace(/[<>]/g, " ")}</p>`)
      .join("");
    return { title: String(mission.title ?? "Artigo"), html: paragraphs || "<p></p>", url };
  });

const SubmitInput = z.object({
  missionId: z.string().uuid(),
  readSeconds: z
    .number()
    .int()
    .min(0)
    .max(60 * 60 * 4),
  scrollPercent: z.number().int().min(0).max(100),
  answers: z
    .array(z.object({ id: z.number().int().min(0).max(50), answer: z.string().max(500) }))
    .max(50),
});

export interface SubmitResult {
  ok: boolean;
  reason?: string;
  creditsAwarded?: number;
  score?: number;
  balance?: number;
  total?: number;
  correct?: number;
}

/**
 * Grade the quiz server-side (answers compared against the stored correct
 * option text) and claim the reward via the secured RPC (reading validation,
 * anti-fraud and daily limits enforced in the database).
 */
export const submitMission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SubmitInput.parse(input))
  .handler(async ({ data, context }): Promise<SubmitResult> => {
    const { supabase } = context;

    const { data: missionRaw } = await supabase.rpc("reward_get_mission", {
      p_id: data.missionId,
    });
    const mission = missionRaw as Record<string, unknown> | null;
    if (!mission) return { ok: false, reason: "mission_not_found" };

    const stored = (Array.isArray(mission.quiz) ? mission.quiz : []) as unknown as StoredQuestion[];
    if (stored.length === 0) return { ok: false, reason: "no_quiz" };

    // Grade: compare submitted answer text to the canonical correct option.
    let correct = 0;
    for (const a of data.answers) {
      const q = stored[a.id];
      if (!q) continue;
      const correctText = q.options[q.correct];
      if (typeof correctText === "string" && a.answer.trim() === correctText.trim()) correct++;
    }
    const total = stored.length;

    const { data: claimRaw, error } = await supabase.rpc("reward_claim", {
      p_mission_id: data.missionId,
      p_total: total,
      p_correct: correct,
      p_read_seconds: data.readSeconds,
      p_scroll_percent: data.scrollPercent,
    });
    if (error) throw new Error("Falha ao registrar a recompensa. Tente novamente.");

    const claim = (claimRaw ?? {}) as Record<string, unknown>;
    return {
      ok: Boolean(claim.ok),
      reason: claim.reason as string | undefined,
      creditsAwarded: Number(claim.credits_awarded ?? 0),
      score: Number(claim.score ?? Math.round((correct / Math.max(total, 1)) * 100)),
      balance: claim.balance != null ? Number(claim.balance) : undefined,
      total,
      correct,
    };
  });

// ---- Admin server functions ------------------------------------------------

export interface RewardAdminMission {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  word_count: number;
  credits: number;
  status: "pending" | "approved" | "rejected";
  source: string;
  url: string;
  read_count: number;
  completion_count: number;
  has_quiz: boolean;
  published_at: string | null;
  created_at: string;
}

export interface RewardAdminStats {
  total_missions: number;
  approved_missions: number;
  pending_missions: number;
  total_completions: number;
  credits_distributed: number;
  participants: number;
  avg_score: number;
  avg_read_seconds: number;
  completion_rate: number;
  top_missions: { title: string; completion_count: number; read_count: number }[];
  top_users: { email: string; completions: number; credits: number }[];
}

/** Admin overview: config + all missions + stats. */
export const getRewardAdminData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [{ data: config }, { data: missions, error: mErr }, { data: stats, error: sErr }] =
      await Promise.all([
        supabase.rpc("reward_config"),
        supabase.rpc("reward_admin_list_missions"),
        supabase.rpc("reward_admin_stats"),
      ]);
    if (mErr || sErr) throw new Error("Acesso negado ou falha ao carregar dados.");
    return {
      config: (config ?? null) as RewardConfig | null,
      missions: (missions ?? []) as unknown as RewardAdminMission[],
      stats: (stats ?? null) as unknown as RewardAdminStats | null,
    };
  });

const SettingsInput = z.object({
  enabled: z.boolean().optional(),
  content_source: z.enum(["official", "manual"]).optional(),
  blog_url: z.string().trim().max(300).optional(),
  auto_approve: z.boolean().optional(),
  credits_per_article: z.number().int().min(0).max(1000).optional(),
  daily_credit_limit: z.number().int().min(0).max(100000).optional(),
  daily_mission_limit: z.number().int().min(0).max(1000).optional(),
  min_scroll_percent: z.number().int().min(0).max(100).optional(),
  seconds_per_100_words: z.number().int().min(1).max(600).optional(),
  pass_threshold: z.number().int().min(0).max(100).optional(),
  credits_by_difficulty: z.record(z.string(), z.number().int().min(0).max(1000)).optional(),
  credits_by_category: z.record(z.string(), z.number().int().min(0).max(1000)).optional(),
  eligible_categories: z.array(z.string().max(80)).max(50).optional(),
});

/** Admin: update reward settings. */
export const updateRewardSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SettingsInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.rpc("reward_admin_update_settings", {
      p: data as unknown as never,
    });
    if (error) throw new Error("Falha ao salvar as configurações.");
    return { ok: true };
  });

const StatusInput = z.object({
  id: z.string().uuid(),
  status: z.enum(["pending", "approved", "rejected"]),
});

/** Admin: approve / reject / reset a mission. */
export const setMissionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => StatusInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.rpc("reward_admin_set_status", {
      p_id: data.id,
      p_status: data.status,
    });
    if (error) throw new Error("Falha ao atualizar a situação da missão.");
    return { ok: true };
  });

/**
 * Admin: scan the official blog (feeds/sitemap), import new eligible articles
 * as missions. Quizzes are generated lazily on first read to save AI credits.
 */
export const syncRewardMissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;

    // Authorize: only admins may sync.
    const { data: config, error: cErr } = await supabase.rpc("reward_config");
    if (cErr) throw new Error("Falha ao carregar a configuração.");
    const cfg = config as RewardConfig | null;
    if (!cfg) throw new Error("Configuração indisponível.");

    const { data: existingRaw, error: eErr } = await supabase.rpc("reward_admin_list_missions");
    if (eErr) throw new Error("Acesso negado.");
    const existing = (existingRaw ?? []) as unknown as RewardAdminMission[];

    const {
      discoverArticles,
      fetchArticleContent,
      normalizeUrl,
      estimateReadSeconds,
      computeDifficulty,
      creditsForMission,
      generateSummary,
    } = await import("./rewards.server");

    const apiKey = process.env.LOVABLE_API_KEY;

    const blogUrl = cfg.blog_url;
    const discovered = await discoverArticles(blogUrl, 30);

    const existingIds = new Set(existing.map((m) => normalizeUrl(m.url)));
    const fresh = discovered.filter((d) => !existingIds.has(normalizeUrl(d.url)));

    let imported = 0;
    // Bound per-run work to keep latency/cost predictable.
    for (const item of fresh.slice(0, 15)) {
      const article = await fetchArticleContent(item.url);
      if (!article || article.wordCount < 120) continue;

      const difficulty = computeDifficulty(article.wordCount);
      const credits = creditsForMission(
        {
          credits_per_article: cfg.credits_per_article,
          credits_by_difficulty: cfg.credits_by_difficulty,
          credits_by_category: cfg.credits_by_category,
        },
        difficulty,
        article.category,
      );
      const status = cfg.auto_approve ? "approved" : "pending";

      // Clean, attractive card description: AI-optimized when possible, always
      // falling back to a sanitized plain-text summary (never raw HTML).
      let summary = "";
      if (apiKey) summary = await generateSummary(apiKey, article.title, article.content);
      if (!summary) summary = makeSummary(item.excerpt || article.excerpt || article.content);

      const { error } = await supabase.rpc("reward_upsert_mission", {
        p: {
          source: "official",
          url: item.url,
          external_id: normalizeUrl(item.url),
          title: htmlToPlainText(item.title || article.title) || article.title,
          excerpt: summary,
          category: article.category,
          difficulty,
          word_count: article.wordCount,
          estimated_read_seconds: estimateReadSeconds(article.wordCount, cfg.seconds_per_100_words),
          credits,
          content: article.content,
          published_at: item.publishedAt ?? "",
          status,
        } as unknown as never,
      });
      if (!error) imported++;
    }

    return { ok: true, scanned: discovered.length, imported };
  });
