/**
 * Server-only worker for the "Agendamento de Publicações" feature.
 *
 * Called by the public cron endpoint (src/routes/api/public/hooks/publish-scheduled.ts)
 * on a schedule. It finds every scheduled post that is due, publishes the
 * associated article to the user's Blogger blog, records execution logs and
 * updates the scheduling status. Uses the service-role client (RLS bypassed)
 * because it runs without a user session.
 */
import { getValidBloggerToken, createBloggerPost, markdownToHtml } from "./blogger.server";

interface RunResult {
  processed: number;
  published: number;
  failed: number;
}

const MAX_ATTEMPTS = 3;

export async function runScheduledPublishing(): Promise<RunResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Fetch posts that are due and still pending. Limit to avoid long runs.
  const nowIso = new Date().toISOString();
  const { data: due, error } = await supabaseAdmin
    .from("scheduled_posts")
    .select("id, user_id, article_id, attempts")
    .eq("status", "pending")
    .lte("scheduled_at", nowIso)
    .order("scheduled_at", { ascending: true })
    .limit(25);

  if (error) {
    console.error("[scheduling] failed to load due posts", error);
    throw new Error("Falha ao carregar publicações agendadas.");
  }

  const result: RunResult = { processed: 0, published: 0, failed: 0 };
  if (!due || due.length === 0) return result;

  for (const row of due) {
    result.processed += 1;
    const attempts = (row.attempts ?? 0) + 1;

    const log = async (level: "info" | "error", message: string) => {
      await supabaseAdmin.from("scheduled_post_logs").insert({
        scheduled_post_id: row.id,
        user_id: row.user_id,
        level,
        message,
      });
    };

    try {
      // Load the article for this user.
      const { data: article, error: articleErr } = await supabaseAdmin
        .from("articles")
        .select("id, title, content, tags, keyword")
        .eq("id", row.article_id)
        .maybeSingle();
      if (articleErr || !article) {
        throw new Error("Artigo não encontrado (pode ter sido excluído).");
      }

      // Resolve the destination blog.
      const { data: conn } = await supabaseAdmin
        .from("blogger_connections")
        .select("selected_blog_id, selected_blog_name")
        .eq("user_id", row.user_id)
        .maybeSingle();
      if (!conn?.selected_blog_id) {
        throw new Error("Nenhum blog do Blogger selecionado para este usuário.");
      }

      const token = await getValidBloggerToken(row.user_id);
      const html = markdownToHtml(article.content || "");
      const title = article.title || article.keyword || "Sem título";
      const labels = Array.isArray(article.tags) ? (article.tags as string[]) : [];

      const post = await createBloggerPost(token, conn.selected_blog_id, title, html, labels);

      await supabaseAdmin
        .from("scheduled_posts")
        .update({
          status: "published",
          attempts,
          blogger_post_id: post.id,
          blogger_post_url: post.url,
          executed_at: new Date().toISOString(),
          error: null,
        })
        .eq("id", row.id);

      // Reflect the published state on the article too.
      await supabaseAdmin
        .from("articles")
        .update({
          status: "published",
          blogger_post_id: post.id,
          blogger_post_url: post.url,
        })
        .eq("id", row.article_id);

      await log("info", `Publicado com sucesso em "${conn.selected_blog_name}": ${post.url}`);
      result.published += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido ao publicar.";
      const giveUp = attempts >= MAX_ATTEMPTS;
      await supabaseAdmin
        .from("scheduled_posts")
        .update({
          status: giveUp ? "failed" : "pending",
          attempts,
          error: message,
          executed_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      await log(
        "error",
        giveUp
          ? `Falha definitiva após ${attempts} tentativa(s): ${message}`
          : `Falha na tentativa ${attempts}, será reprocessado: ${message}`,
      );
      result.failed += 1;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// CRUD helpers reused by createServerFn AND the /api/v1/scheduling REST layer.
// These operate through a user-scoped Supabase client (RLS applied).
// ---------------------------------------------------------------------------
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type SB = SupabaseClient<Database>;

export interface ScheduledPostRow {
  id: string;
  article_id: string;
  article_title: string;
  scheduled_at: string;
  status: string;
  attempts: number;
  blogger_post_url: string | null;
  error: string | null;
  executed_at: string | null;
  created_at: string;
}

export async function listScheduledPostsFor(supabase: SB): Promise<ScheduledPostRow[]> {
  const { data, error } = await supabase
    .from("scheduled_posts")
    .select(
      "id, article_id, scheduled_at, status, attempts, blogger_post_url, error, executed_at, created_at, articles(title, keyword)",
    )
    .order("scheduled_at", { ascending: true });
  if (error) throw new Error("Não foi possível carregar os agendamentos.");
  return (data ?? []).map((r) => {
    const art = r.articles as { title?: string; keyword?: string } | null;
    return {
      id: r.id,
      article_id: r.article_id,
      article_title: art?.title || art?.keyword || "Artigo",
      scheduled_at: r.scheduled_at,
      status: r.status,
      attempts: r.attempts,
      blogger_post_url: r.blogger_post_url,
      error: r.error,
      executed_at: r.executed_at,
      created_at: r.created_at,
    };
  });
}

export async function createScheduledPostFor(
  supabase: SB,
  userId: string,
  input: { articleId: string; scheduledAt: string },
): Promise<{ id: string }> {
  const when = new Date(input.scheduledAt);
  if (Number.isNaN(when.getTime()) || when.getTime() < Date.now() - 60_000) {
    throw new Error("Escolha uma data e horário futuros.");
  }
  const { data: article, error: aErr } = await supabase
    .from("articles")
    .select("id")
    .eq("id", input.articleId)
    .maybeSingle();
  if (aErr || !article) throw new Error("Artigo não encontrado.");

  const { data: inserted, error } = await supabase
    .from("scheduled_posts")
    .insert({
      user_id: userId,
      article_id: input.articleId,
      scheduled_at: when.toISOString(),
      status: "pending",
    })
    .select("id")
    .single();
  if (error) throw new Error("Não foi possível criar o agendamento.");
  return { id: inserted.id };
}

export async function rescheduleScheduledPostFor(
  supabase: SB,
  id: string,
  scheduledAt: string,
): Promise<void> {
  const when = new Date(scheduledAt);
  if (Number.isNaN(when.getTime()) || when.getTime() < Date.now() - 60_000) {
    throw new Error("Escolha uma data e horário futuros.");
  }
  const { error } = await supabase
    .from("scheduled_posts")
    .update({ scheduled_at: when.toISOString(), status: "pending", error: null })
    .eq("id", id)
    .in("status", ["pending", "failed", "canceled"]);
  if (error) throw new Error("Não foi possível reagendar.");
}

export async function cancelScheduledPostFor(supabase: SB, id: string): Promise<void> {
  const { error } = await supabase
    .from("scheduled_posts")
    .update({ status: "canceled" })
    .eq("id", id)
    .eq("status", "pending");
  if (error) throw new Error("Não foi possível cancelar o agendamento.");
}

export async function deleteScheduledPostFor(supabase: SB, id: string): Promise<void> {
  const { error } = await supabase.from("scheduled_posts").delete().eq("id", id);
  if (error) throw new Error("Não foi possível excluir o agendamento.");
}

export async function getScheduledPostLogsFor(supabase: SB, id: string) {
  const { data, error } = await supabase
    .from("scheduled_post_logs")
    .select("id, level, message, created_at")
    .eq("scheduled_post_id", id)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Não foi possível carregar os registros.");
  return data ?? [];
}
