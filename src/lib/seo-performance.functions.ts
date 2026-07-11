import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface SeoSeriesPoint {
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SeoTableRow {
  key: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  /** Difference in clicks vs the previous comparable period (when computed). */
  deltaClicks?: number;
}

export interface SeoTotals {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SeoBlogOption {
  id: string;
  name: string;
  url: string;
  siteUrl: string | null;
  /** Whether the connected account is a verified owner of the matched property. */
  verified: boolean;
}

/** One automatic diagnostic check, surfaced transparently to the user. */
export interface SeoDiagnosticStep {
  id: string;
  label: string;
  status: "ok" | "warn" | "fail" | "skip";
  detail: string;
}

export type SeoReason =
  | "not-connected"
  | "scope-missing"
  | "api-disabled"
  | "no-permission"
  | "unverified"
  | "no-site"
  | "error";

export interface SeoPerformance {
  available: boolean;
  reason?: SeoReason;
  message?: string;
  /** Property name the diagnosis refers to (e.g. the unverified property). */
  problemSite?: string;
  blogs?: SeoBlogOption[];
  activeBlogId?: string;
  siteUrl?: string;
  range?: { startDate: string; endDate: string; days: number };
  totals?: SeoTotals;
  previous?: SeoTotals | null;
  series?: SeoSeriesPoint[];
  pages?: SeoTableRow[];
  queries?: SeoTableRow[];
  countries?: SeoTableRow[];
  devices?: SeoTableRow[];
  appearance?: SeoTableRow[];
  gainers?: SeoTableRow[];
  losers?: SeoTableRow[];
  fetchedAt?: string;
  cached?: boolean;
  /** Full automatic diagnostic report (always populated). */
  diagnostics?: SeoDiagnosticStep[];
}

const Input = z.object({
  days: z.number().int().min(1).max(365).optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  blogId: z.string().max(60).optional(),
  refresh: z.boolean().optional(),
});

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function diffDays(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000) + 1;
}

function rowToTotals(
  rows: { clicks: number; impressions: number; ctr: number; position: number }[],
): SeoTotals {
  const r = rows[0];
  return r
    ? { clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position }
    : { clicks: 0, impressions: 0, ctr: 0, position: 0 };
}

/**
 * Native Google Search Console dashboard data for the user's blogs.
 *
 * OAuth: the Blogger connection already grants `webmasters.readonly`, so the
 * stored refresh token doubles as Search Console authorization — no second
 * consent flow is required. Tokens never leave the server.
 *
 * Self-diagnosis: every call runs a full automatic diagnostic (scopes, token,
 * refresh, property match, verified ownership, data availability, cache) and
 * returns it in `diagnostics`. Any problem produces a precise, plain-language
 * reason instead of a generic "Dados indisponíveis" / "Reconecte sua conta".
 *
 * Caching: results are cached per user + property + date range for 3h in
 * public.seo_cache to avoid hammering the API. Pass `refresh: true` to bypass.
 */
export const getSeoPerformance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data, context }): Promise<SeoPerformance> => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const diag: SeoDiagnosticStep[] = [];
    const step = (
      id: string,
      label: string,
      status: SeoDiagnosticStep["status"],
      detail: string,
    ) => {
      diag.push({ id, label, status, detail });
    };

    const { data: conn } = await supabaseAdmin
      .from("blogger_connections")
      .select("selected_blog_id, google_email")
      .eq("user_id", userId)
      .maybeSingle();
    if (!conn) {
      step("connection", "Conta Google conectada", "fail", "Nenhuma conexão do Blogger encontrada.");
      return {
        available: false,
        reason: "not-connected",
        message:
          "Conecte sua conta do Google (Blogger) para liberar os dados do Google Search Console.",
        diagnostics: diag,
      };
    }
    step(
      "connection",
      "Conta Google conectada",
      "ok",
      `Conectado como ${conn.google_email ?? "conta Google"}.`,
    );

    // Resolve the date range (custom range wins over `days`).
    const end = new Date();
    end.setDate(end.getDate() - 2); // GSC data has ~2 day delay
    let endDate = data.endDate ?? isoDate(end);
    let startDate: string;
    if (data.startDate) {
      startDate = data.startDate;
    } else {
      const days = data.days ?? 28;
      const start = new Date(endDate);
      start.setDate(start.getDate() - (days - 1));
      startDate = isoDate(start);
    }
    if (new Date(startDate) > new Date(endDate)) {
      [startDate, endDate] = [endDate, startDate];
    }
    const spanDays = diffDays(startDate, endDate);

    try {
      const { getBloggerTokenDiagnostics, fetchUserBlogs } = await import("./blogger.server");
      const {
        fetchSearchConsoleSites,
        matchSiteDetailed,
        querySearchAnalytics,
        readSeoCache,
        writeSeoCache,
      } = await import("./seo-performance.server");

      // Step: token validity + silent refresh + scope check.
      const tokenInfo = await getBloggerTokenDiagnostics(userId);
      const token = tokenInfo.token;
      step(
        "token",
        "Sessão do Google válida",
        "ok",
        tokenInfo.refreshed
          ? "O acesso expirou e foi renovado automaticamente pelo refresh token — nenhuma ação necessária."
          : "Token de acesso ativo e válido.",
      );
      step(
        "refresh",
        "Renovação automática (refresh token)",
        tokenInfo.hasRefreshToken ? "ok" : "warn",
        tokenInfo.hasRefreshToken
          ? "Refresh token presente: a sessão se renova sozinha sem novo login."
          : "Sem refresh token: um novo login pode ser necessário quando o acesso expirar.",
      );
      step(
        "scopes",
        "Permissões de leitura do Search Console",
        tokenInfo.hasSearchConsoleScope ? "ok" : "fail",
        tokenInfo.hasSearchConsoleScope
          ? "O escopo webmasters.readonly está presente."
          : "O escopo de leitura do Search Console não foi concedido nesta conexão.",
      );
      if (!tokenInfo.hasSearchConsoleScope) {
        return {
          available: false,
          reason: "scope-missing",
          message:
            "Sua conexão com o Google foi criada antes do acesso ao Search Console. Reconecte sua conta uma única vez em Conexões para liberar os dados — é rápido e não afeta suas publicações.",
          diagnostics: diag,
        };
      }

      const [blogsRaw, sites] = await Promise.all([
        fetchUserBlogs(token),
        fetchSearchConsoleSites(token),
      ]);
      step(
        "blogs",
        "Blogs da conta localizados",
        blogsRaw.length ? "ok" : "fail",
        blogsRaw.length
          ? `${blogsRaw.length} blog(s) encontrado(s) na conta do Blogger.`
          : "Nenhum blog encontrado nesta conta do Blogger.",
      );

      const matches = blogsRaw.map((b) => ({ blog: b, match: matchSiteDetailed(sites, b.url) }));
      const blogs: SeoBlogOption[] = matches.map((m) => ({
        id: m.blog.id,
        name: m.blog.name,
        url: m.blog.url,
        siteUrl: m.match?.siteUrl ?? null,
        verified: m.match?.verified ?? false,
      }));

      const verifiedCount = blogs.filter((b) => b.verified).length;
      step(
        "properties",
        "Propriedades no Search Console",
        sites.length ? "ok" : "warn",
        `${sites.length} propriedade(s) visível(is); ${verifiedCount} com propriedade verificada e pronta para leitura.`,
      );

      if (blogs.length === 0) {
        return {
          available: false,
          reason: "no-site",
          message: "Nenhum blog foi encontrado nesta conta do Blogger.",
          diagnostics: diag,
        };
      }

      // Pick the active blog. Auto-correction: prefer a blog whose property is
      // VERIFIED so the dashboard shows real data by default. Only fall back to
      // an unverified/no-site blog when nothing better exists.
      const requested = data.blogId ? blogs.find((b) => b.id === data.blogId) : undefined;
      const activeBlog =
        requested ??
        blogs.find((b) => b.id === conn.selected_blog_id && b.verified) ??
        blogs.find((b) => b.verified) ??
        blogs.find((b) => b.id === conn.selected_blog_id && b.siteUrl) ??
        blogs.find((b) => b.siteUrl) ??
        blogs[0];

      const activeMatch = matches.find((m) => m.blog.id === activeBlog.id)?.match ?? null;
      const siteUrl = activeMatch?.siteUrl ?? null;

      if (!siteUrl) {
        step(
          "match",
          "Propriedade correspondente ao blog",
          "fail",
          `Nenhuma propriedade do Search Console corresponde a ${activeBlog.url}.`,
        );
        return {
          available: false,
          reason: "no-site",
          blogs,
          activeBlogId: activeBlog.id,
          problemSite: activeBlog.url,
          message:
            "Este blog ainda não possui uma propriedade correspondente no Google Search Console. Adicione o site como propriedade no Search Console usando a mesma conta Google conectada.",
          diagnostics: diag,
        };
      }

      step(
        "match",
        "Propriedade correspondente ao blog",
        "ok",
        `${activeBlog.url} → ${siteUrl}.`,
      );

      // Verified-ownership check — this is the true cause of the classic 403.
      if (!activeMatch?.verified) {
        step(
          "ownership",
          "Propriedade verificada",
          "fail",
          `A conta não é proprietária verificada de ${siteUrl} (permissão: ${activeMatch?.permissionLevel ?? "desconhecida"}).`,
        );
        return {
          available: false,
          reason: "unverified",
          blogs,
          activeBlogId: activeBlog.id,
          siteUrl,
          problemSite: siteUrl,
          message:
            "Encontramos a propriedade deste blog no Search Console, mas a conta Google conectada ainda não é uma proprietária verificada dela. Por isso o Google bloqueia a leitura dos dados. Verifique a propriedade no Search Console (ou peça ao proprietário para adicionar sua conta) — não é preciso reconectar nada aqui.",
          diagnostics: diag,
        };
      }
      step("ownership", "Propriedade verificada", "ok", `Acesso verificado a ${siteUrl}.`);

      // Smart cache lookup.
      const cacheKey = `perf:${siteUrl}:${startDate}:${endDate}`;
      if (!data.refresh) {
        const cached = await readSeoCache(userId, cacheKey);
        if (cached) {
          step("cache", "Cache do BlogAI Pro", "ok", "Dados servidos do cache (válido por 3h).");
          const payload = cached.payload as SeoPerformance;
          return {
            ...payload,
            blogs,
            activeBlogId: activeBlog.id,
            cached: true,
            fetchedAt: cached.fetchedAt,
            diagnostics: [
              ...diag,
              {
                id: "data",
                label: "Dados carregados",
                status: "ok",
                detail: "Métricas, gráficos e tabelas preenchidos a partir do cache.",
              },
            ],
          };
        }
      }
      step(
        "cache",
        "Cache do BlogAI Pro",
        "ok",
        data.refresh ? "Atualização forçada — cache ignorado." : "Sem cache válido — buscando na API.",
      );

      // Previous comparable period (same length, immediately before).
      const prevEnd = new Date(startDate);
      prevEnd.setDate(prevEnd.getDate() - 1);
      const prevStart = new Date(prevEnd);
      prevStart.setDate(prevStart.getDate() - (spanDays - 1));
      const prev = { startDate: isoDate(prevStart), endDate: isoDate(prevEnd) };
      const range = { startDate, endDate };

      const [
        totalsRows,
        prevTotalsRows,
        dateRows,
        pageRows,
        prevPageRows,
        queryRows,
        countryRows,
        deviceRows,
        appearanceRows,
      ] = await Promise.all([
        querySearchAnalytics(token, siteUrl, { ...range }),
        querySearchAnalytics(token, siteUrl, { ...prev }),
        querySearchAnalytics(token, siteUrl, { ...range, dimensions: ["date"], rowLimit: 500 }),
        querySearchAnalytics(token, siteUrl, { ...range, dimensions: ["page"], rowLimit: 100 }),
        querySearchAnalytics(token, siteUrl, { ...prev, dimensions: ["page"], rowLimit: 100 }),
        querySearchAnalytics(token, siteUrl, { ...range, dimensions: ["query"], rowLimit: 50 }),
        querySearchAnalytics(token, siteUrl, { ...range, dimensions: ["country"], rowLimit: 50 }),
        querySearchAnalytics(token, siteUrl, { ...range, dimensions: ["device"], rowLimit: 10 }),
        querySearchAnalytics(token, siteUrl, {
          ...range,
          dimensions: ["searchAppearance"],
          rowLimit: 20,
        }).catch(() => []),
      ]);

      const toRow = (r: {
        keys?: string[];
        clicks: number;
        impressions: number;
        ctr: number;
        position: number;
      }): SeoTableRow => ({
        key: r.keys?.[0] ?? "",
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: r.ctr,
        position: r.position,
      });

      // Growth/decline by page (current vs previous clicks).
      const prevByPage = new Map(prevPageRows.map((r) => [r.keys?.[0] ?? "", r.clicks]));
      const pagesWithDelta: SeoTableRow[] = pageRows.map((r) => {
        const key = r.keys?.[0] ?? "";
        return { ...toRow(r), deltaClicks: r.clicks - (prevByPage.get(key) ?? 0) };
      });
      // Include pages that lost all traffic (present before, absent now).
      const currentPageKeys = new Set(pagesWithDelta.map((p) => p.key));
      for (const [key, clicks] of prevByPage) {
        if (!currentPageKeys.has(key) && clicks > 0) {
          pagesWithDelta.push({
            key,
            clicks: 0,
            impressions: 0,
            ctr: 0,
            position: 0,
            deltaClicks: -clicks,
          });
        }
      }
      const gainers = [...pagesWithDelta]
        .filter((p) => (p.deltaClicks ?? 0) > 0)
        .sort((a, b) => (b.deltaClicks ?? 0) - (a.deltaClicks ?? 0))
        .slice(0, 10);
      const losers = [...pagesWithDelta]
        .filter((p) => (p.deltaClicks ?? 0) < 0)
        .sort((a, b) => (a.deltaClicks ?? 0) - (b.deltaClicks ?? 0))
        .slice(0, 10);

      const totals = rowToTotals(totalsRows);
      const series = dateRows.map((r) => ({
        date: r.keys?.[0] ?? "",
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: r.ctr,
        position: r.position,
      }));

      const hasData = totals.clicks > 0 || totals.impressions > 0 || series.length > 0;
      step(
        "api-data",
        "Dados retornados pela API",
        hasData ? "ok" : "warn",
        hasData
          ? `${series.length} dia(s) de dados recebidos.`
          : "A API respondeu com sucesso, mas ainda não há cliques/impressões neste período. Isso é normal em sites novos ou pode indicar atraso de sincronização do Google (até ~48h).",
      );
      step(
        "render",
        "Gráficos, cards e tabelas",
        "ok",
        "Métricas, série temporal e tabelas processadas e prontas para exibição.",
      );

      const payload: SeoPerformance = {
        available: true,
        siteUrl,
        range: { ...range, days: spanDays },
        totals,
        previous: prevTotalsRows.length ? rowToTotals(prevTotalsRows) : null,
        series,
        pages: pageRows.map(toRow).slice(0, 50),
        queries: queryRows.map(toRow),
        countries: countryRows.map(toRow),
        devices: deviceRows.map(toRow),
        appearance: appearanceRows.map(toRow),
        gainers,
        losers,
        fetchedAt: new Date().toISOString(),
        cached: false,
      };

      // Cache for 3 hours (GSC refreshes at most daily).
      await writeSeoCache(userId, cacheKey, siteUrl, payload, 3 * 60 * 60).catch(() => {});

      return { ...payload, blogs, activeBlogId: activeBlog.id, diagnostics: diag };
    } catch (err) {
      const { GscError } = await import("./seo-performance.server");
      if (err instanceof GscError) {
        step("api", "Chamada à API do Search Console", "fail", err.message);
        return { available: false, reason: err.code, message: err.message, diagnostics: diag };
      }
      const message = err instanceof Error ? err.message : "";
      console.error("[seo-performance]", message);
      step(
        "api",
        "Chamada à API do Search Console",
        "fail",
        message || "Erro inesperado ao consultar o Search Console.",
      );
      return {
        available: false,
        reason: "error",
        message:
          message ||
          "Não foi possível carregar os dados do Search Console no momento. Tente atualizar em instantes.",
        diagnostics: diag,
      };
    }
  });
