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
}

export interface SeoPerformance {
  available: boolean;
  reason?: "not-connected" | "scope-missing" | "no-site" | "error";
  message?: string;
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
 * Caching: results are cached per user + property + date range for 3h in
 * public.seo_cache to avoid hammering the API. Pass `refresh: true` to bypass.
 */
export const getSeoPerformance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data, context }): Promise<SeoPerformance> => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: conn } = await supabaseAdmin
      .from("blogger_connections")
      .select("selected_blog_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!conn) {
      return {
        available: false,
        reason: "not-connected",
        message:
          "Conecte sua conta do Google (Blogger) para liberar os dados do Google Search Console.",
      };
    }

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
      const { getValidBloggerToken, fetchUserBlogs } = await import("./blogger.server");
      const {
        fetchSearchConsoleSites,
        matchSite,
        querySearchAnalytics,
        readSeoCache,
        writeSeoCache,
      } = await import("./seo-performance.server");

      const token = await getValidBloggerToken(userId);
      const [blogsRaw, sites] = await Promise.all([
        fetchUserBlogs(token),
        fetchSearchConsoleSites(token),
      ]);

      const blogs: SeoBlogOption[] = blogsRaw.map((b) => ({
        id: b.id,
        name: b.name,
        url: b.url,
        siteUrl: matchSite(sites, b.url),
      }));

      if (blogs.length === 0) {
        return {
          available: false,
          reason: "no-site",
          message: "Nenhum blog foi encontrado nesta conta do Blogger.",
        };
      }

      // Pick the active blog: requested → selected → first with a GSC property → first.
      const activeBlog =
        blogs.find((b) => b.id === data.blogId) ??
        blogs.find((b) => b.id === conn.selected_blog_id && b.siteUrl) ??
        blogs.find((b) => b.siteUrl) ??
        blogs[0];

      const siteUrl = activeBlog.siteUrl;
      if (!siteUrl) {
        return {
          available: false,
          reason: "no-site",
          blogs,
          activeBlogId: activeBlog.id,
          message:
            "Nenhuma propriedade correspondente a este blog foi encontrada no Google Search Console. Verifique se o site está verificado na sua conta do Search Console.",
        };
      }

      // Smart cache lookup.
      const cacheKey = `perf:${siteUrl}:${startDate}:${endDate}`;
      if (!data.refresh) {
        const cached = await readSeoCache(userId, cacheKey);
        if (cached) {
          const payload = cached.payload as SeoPerformance;
          return {
            ...payload,
            blogs,
            activeBlogId: activeBlog.id,
            cached: true,
            fetchedAt: cached.fetchedAt,
          };
        }
      }

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

      const payload: SeoPerformance = {
        available: true,
        siteUrl,
        range: { ...range, days: spanDays },
        totals: rowToTotals(totalsRows),
        previous: prevTotalsRows.length ? rowToTotals(prevTotalsRows) : null,
        series: dateRows.map((r) => ({
          date: r.keys?.[0] ?? "",
          clicks: r.clicks,
          impressions: r.impressions,
          ctr: r.ctr,
          position: r.position,
        })),
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

      return { ...payload, blogs, activeBlogId: activeBlog.id };
    } catch (err) {
      const { GscError } = await import("./seo-performance.server");
      if (err instanceof GscError) {
        return { available: false, reason: err.code, message: err.message };
      }
      const message = err instanceof Error ? err.message : "";
      console.error("[seo-performance]", message);
      return {
        available: false,
        reason: "error",
        message: "Não foi possível carregar os dados do Search Console no momento.",
      };
    }
  });
