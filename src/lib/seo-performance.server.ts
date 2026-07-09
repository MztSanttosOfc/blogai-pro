/**
 * Server-only helpers for Google Search Console (Search Analytics API).
 * Powers the "Painel de Desempenho SEO" — a native Search Console dashboard
 * embedded inside BlogAI Pro. All access tokens stay on the server.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

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
  startRow?: number;
  type?: "web" | "image" | "video" | "news" | "discover" | "googleNews";
  dataState?: "final" | "all";
}

/** Run a Search Analytics query for a property. */
export async function querySearchAnalytics(
  accessToken: string,
  siteUrl: string,
  q: AnalyticsQuery,
): Promise<GscRow[]> {
  const body: Record<string, unknown> = {
    startDate: q.startDate,
    endDate: q.endDate,
    dimensions: q.dimensions ?? [],
    rowLimit: q.rowLimit ?? 25,
    dataState: q.dataState ?? "final",
  };
  if (q.startRow) body.startRow = q.startRow;
  if (q.type) body.type = q.type;

  const res = await fetch(
    `${WEBMASTERS_API}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  if (res.status === 403) throw new Error("SCOPE_MISSING");
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    console.error("[gsc] search analytics failed", res.status, errBody);
    throw new Error(`Falha ao consultar o Search Console (${res.status}).`);
  }
  const data = (await res.json()) as { rows?: GscRow[] };
  return data.rows ?? [];
}

/* ----------------------------- Smart cache ----------------------------- */
/*
 * Cached responses live in public.seo_cache and are read/written exclusively
 * through the service-role client (bypasses RLS). The browser never touches
 * this table nor the underlying Google tokens.
 */

interface CachedEntry {
  payload: unknown;
  fetchedAt: string;
}

export async function readSeoCache(userId: string, key: string): Promise<CachedEntry | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as unknown as SupabaseClient;
  const { data, error } = await admin
    .from("seo_cache")
    .select("payload, expires_at, updated_at")
    .eq("user_id", userId)
    .eq("cache_key", key)
    .maybeSingle();
  if (error || !data) return null;
  if (new Date(data.expires_at as string).getTime() < Date.now()) return null;
  return { payload: data.payload, fetchedAt: (data.updated_at as string) ?? new Date().toISOString() };
}

export async function writeSeoCache(
  userId: string,
  key: string,
  siteUrl: string | null,
  payload: unknown,
  ttlSeconds: number,
): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as unknown as SupabaseClient;
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  await admin.from("seo_cache").upsert(
    {
      user_id: userId,
      cache_key: key,
      site_url: siteUrl,
      payload,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,cache_key" },
  );
}
