/**
 * Server-only helpers for Google Search Console (Search Analytics API).
 * Used by the "Painel de Desempenho SEO" feature.
 */
const WEBMASTERS_API = "https://www.googleapis.com/webmasters/v3";

export interface GscRow {
  keys?: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscSite {
  siteUrl: string;
  permissionLevel: string;
}

/** List Search Console properties the connected account can access. */
export async function fetchSearchConsoleSites(accessToken: string): Promise<GscSite[]> {
  const res = await fetch(`${WEBMASTERS_API}/sites`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 403) {
    throw new Error("SCOPE_MISSING");
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[gsc] list sites failed", res.status, body);
    throw new Error(`Falha ao listar propriedades do Search Console (${res.status}).`);
  }
  const data = (await res.json()) as { siteEntry?: GscSite[] };
  return data.siteEntry ?? [];
}

/**
 * Pick the Search Console property that best matches a blog URL.
 * Handles both URL-prefix properties and sc-domain properties.
 */
export function matchSite(sites: GscSite[], blogUrl: string): string | null {
  if (!blogUrl) return null;
  let host = "";
  try {
    host = new URL(blogUrl).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
  const rootDomain = host.split(".").slice(-2).join(".");

  // 1) exact URL-prefix match
  const prefix = sites.find((s) => {
    try {
      return new URL(s.siteUrl).hostname.replace(/^www\./, "") === host;
    } catch {
      return false;
    }
  });
  if (prefix) return prefix.siteUrl;

  // 2) sc-domain match
  const domain = sites.find(
    (s) => s.siteUrl === `sc-domain:${host}` || s.siteUrl === `sc-domain:${rootDomain}`,
  );
  if (domain) return domain.siteUrl;

  // 3) any property containing the root domain
  const loose = sites.find((s) => s.siteUrl.includes(rootDomain));
  return loose ? loose.siteUrl : null;
}

export interface AnalyticsQuery {
  startDate: string;
  endDate: string;
  dimensions?: string[];
  rowLimit?: number;
}

/** Run a Search Analytics query for a property. */
export async function querySearchAnalytics(
  accessToken: string,
  siteUrl: string,
  q: AnalyticsQuery,
): Promise<GscRow[]> {
  const res = await fetch(
    `${WEBMASTERS_API}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate: q.startDate,
        endDate: q.endDate,
        dimensions: q.dimensions ?? [],
        rowLimit: q.rowLimit ?? 25,
      }),
    },
  );
  if (res.status === 403) throw new Error("SCOPE_MISSING");
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[gsc] search analytics failed", res.status, body);
    throw new Error(`Falha ao consultar o Search Console (${res.status}).`);
  }
  const data = (await res.json()) as { rows?: GscRow[] };
  return data.rows ?? [];
}
