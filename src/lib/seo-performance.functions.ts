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
}

export interface SeoPerformance {
  available: boolean;
  reason?: "not-connected" | "scope-missing" | "no-site" | "error";
  message?: string;
  siteUrl?: string;
  totals?: { clicks: number; impressions: number; ctr: number; position: number };
  series?: SeoSeriesPoint[];
  pages?: SeoTableRow[];
  queries?: SeoTableRow[];
}

const RangeInput = z.object({ days: z.number().int().min(7).max(90).default(28) });

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Fetch Search Console performance for the user's selected Blogger blog. */
export const getSeoPerformance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RangeInput.parse(input))
  .handler(async ({ data, context }): Promise<SeoPerformance> => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: conn } = await supabaseAdmin
      .from("blogger_connections")
      .select("selected_blog_id, selected_blog_name")
      .eq("user_id", userId)
      .maybeSingle();
    if (!conn) {
      return {
        available: false,
        reason: "not-connected",
        message: "Conecte sua conta do Google (Blogger) para ver os dados do Search Console.",
      };
    }

    // Resolve the blog URL.
    let blogUrl = "";
    try {
      const { getValidBloggerToken } = await import("./blogger.server");
      const { fetchUserBlogs } = await import("./blogger.server");
      const token = await getValidBloggerToken(userId);
      const blogs = await fetchUserBlogs(token);
      const match = blogs.find((b) => b.id === conn.selected_blog_id);
      blogUrl = match?.url ?? blogs[0]?.url ?? "";

      const { fetchSearchConsoleSites, matchSite, querySearchAnalytics } =
        await import("./seo-performance.server");

      const sites = await fetchSearchConsoleSites(token);
      const siteUrl = matchSite(sites, blogUrl);
      if (!siteUrl) {
        return {
          available: false,
          reason: "no-site",
          message:
            "Nenhuma propriedade correspondente ao seu blog foi encontrada no Google Search Console. Verifique se o site está verificado na sua conta.",
        };
      }

      const end = new Date();
      end.setDate(end.getDate() - 2); // GSC data has ~2 day delay
      const start = new Date(end);
      start.setDate(start.getDate() - data.days);
      const range = { startDate: isoDate(start), endDate: isoDate(end) };

      const [totalsRows, dateRows, pageRows, queryRows] = await Promise.all([
        querySearchAnalytics(token, siteUrl, { ...range }),
        querySearchAnalytics(token, siteUrl, { ...range, dimensions: ["date"], rowLimit: 100 }),
        querySearchAnalytics(token, siteUrl, { ...range, dimensions: ["page"], rowLimit: 25 }),
        querySearchAnalytics(token, siteUrl, { ...range, dimensions: ["query"], rowLimit: 25 }),
      ]);

      const t = totalsRows[0];
      return {
        available: true,
        siteUrl,
        totals: t
          ? {
              clicks: t.clicks,
              impressions: t.impressions,
              ctr: t.ctr,
              position: t.position,
            }
          : { clicks: 0, impressions: 0, ctr: 0, position: 0 },
        series: dateRows.map((r) => ({
          date: r.keys?.[0] ?? "",
          clicks: r.clicks,
          impressions: r.impressions,
          ctr: r.ctr,
          position: r.position,
        })),
        pages: pageRows.map((r) => ({
          key: r.keys?.[0] ?? "",
          clicks: r.clicks,
          impressions: r.impressions,
          ctr: r.ctr,
          position: r.position,
        })),
        queries: queryRows.map((r) => ({
          key: r.keys?.[0] ?? "",
          clicks: r.clicks,
          impressions: r.impressions,
          ctr: r.ctr,
          position: r.position,
        })),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message === "SCOPE_MISSING") {
        return {
          available: false,
          reason: "scope-missing",
          message:
            "Reconecte sua conta do Google em Blogger para conceder acesso de leitura ao Search Console.",
        };
      }
      console.error("[seo-performance]", message);
      return {
        available: false,
        reason: "error",
        message: "Não foi possível carregar os dados do Search Console no momento.",
      };
    }
  });
