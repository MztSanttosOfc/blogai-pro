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

/** Distinguishable Google Search Console failure codes surfaced to the UI. */
export type GscErrorCode =
  | "scope-missing"
  | "api-disabled"
  | "no-permission"
  | "unverified"
  | "error";

export class GscError extends Error {
  code: GscErrorCode;
  constructor(code: GscErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "GscError";
  }
}

/**
 * Turn a Google 403/4xx response body into an actionable error.
 * A 403 can mean several very different things — never collapse them all into
 * "reconnect your account", which is the classic misleading symptom.
 */
export function classifyGscError(status: number, body: string): GscError {
  const lower = body.toLowerCase();
  if (
    lower.includes("has not been used in project") ||
    lower.includes("service_disabled") ||
    lower.includes("it is disabled") ||
    lower.includes("accessnotconfigured")
  ) {
    return new GscError(
      "api-disabled",
      "A API do Google Search Console ainda não está ativada no projeto do Google Cloud desta integração.",
    );
  }
  if (
    lower.includes("insufficient authentication scopes") ||
    lower.includes("insufficientpermissions") ||
    lower.includes("insufficient permission")
  ) {
    return new GscError(
      "scope-missing",
      "Reconecte sua conta do Google em Conexões para conceder acesso de leitura ao Search Console.",
    );
  }
  if (status === 403) {
    return new GscError(
      "unverified",
      "A conta do Google conectada ainda não é proprietária verificada desta propriedade no Search Console.",
    );
  }
  return new GscError("error", `Falha ao acessar o Search Console (${status}).`);
}

/** List Search Console properties the connected account can access. */
export async function fetchSearchConsoleSites(accessToken: string): Promise<GscSite[]> {
  const res = await fetch(`${WEBMASTERS_API}/sites`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[gsc] list sites failed", res.status, body);
    throw classifyGscError(res.status, body);
  }
  const data = (await res.json()) as { siteEntry?: GscSite[] };
  return data.siteEntry ?? [];
}

/**
 * Google Search Console permission levels, from strongest to weakest:
 *   siteOwner          — full owner (verified). Can read all data.
 *   siteFullUser       — full user (verified). Can read all data.
 *   siteRestrictedUser — restricted user (verified). Can read most data.
 *   siteUnverifiedUser — sees the property but is NOT verified. Google 403s
 *                        every searchAnalytics call — the true cause of the
 *                        classic "Dados indisponíveis" symptom.
 * Anything other than `siteUnverifiedUser` (and non-empty) can read data.
 */
export type PermissionClass =
  | "siteOwner"
  | "siteFullUser"
  | "siteRestrictedUser"
  | "siteUnverifiedUser"
  | "unknown";

export function classifyPermission(level: string | undefined | null): PermissionClass {
  switch (level) {
    case "siteOwner":
    case "siteFullUser":
    case "siteRestrictedUser":
    case "siteUnverifiedUser":
      return level;
    default:
      return "unknown";
  }
}

/** Rank used to pick the strongest property when several match a blog. */
function permissionRank(level: string | undefined | null): number {
  switch (classifyPermission(level)) {
    case "siteOwner":
      return 3;
    case "siteFullUser":
      return 2;
    case "siteRestrictedUser":
      return 1;
    default:
      return 0; // unverified / unknown → not readable
  }
}

/**
 * A property is queryable only when the account is a verified owner/user.
 * `siteUnverifiedUser` and unknown/empty levels cannot read data.
 */
export function isVerifiedPermission(level: string | undefined | null): boolean {
  return permissionRank(level) > 0;
}

/** Human-readable, plain-language description of a permission level. */
export function describePermission(level: string | undefined | null): string {
  switch (classifyPermission(level)) {
    case "siteOwner":
      return "Proprietário verificado (acesso total).";
    case "siteFullUser":
      return "Usuário com acesso total (verificado).";
    case "siteRestrictedUser":
      return "Usuário com acesso restrito (verificado).";
    case "siteUnverifiedUser":
      return "Conta ainda não verificada nesta propriedade.";
    default:
      return "Nível de permissão desconhecido.";
  }
}

/** How a blog URL was matched to a Search Console property (for diagnostics). */
export type MatchKind =
  | "exact-url"
  | "exact-domain"
  | "root-domain"
  | "subdomain"
  | "none";

export interface SiteMatch {
  siteUrl: string;
  permissionLevel: string;
  verified: boolean;
  matchedBy: MatchKind;
}

/**
 * Pick the Search Console property that best matches a blog URL.
 *
 * Universal matching — works for any account regardless of how the blog is
 * hosted. It normalizes both sides (drops protocol via URL parsing, strips a
 * leading `www.`, is case-insensitive) and considers every property type:
 *   • URL-prefix properties  → `https://example.com/`
 *   • Domain properties      → `sc-domain:example.com`
 * and every relationship: exact host, exact domain, root domain, and
 * subdomain. Shared multi-tenant roots (blogspot.com, wordpress.com, …) only
 * ever match on the exact host so two tenants never cross-match.
 *
 * When several properties match, it prefers the strongest permission first,
 * then the most specific URL relationship — so the panel defaults to a
 * property it can actually read.
 */
export function matchSiteDetailed(sites: GscSite[], blogUrl: string): SiteMatch | null {
  if (!blogUrl) return null;
  let host = "";
  try {
    host = new URL(blogUrl).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
  const rootDomain = host.split(".").slice(-2).join(".");
  // Multi-tenant suffixes: only an exact host match is valid, never the shared
  // root (e.g. two different *.blogspot.com blogs must not cross-match).
  const sharedSuffix =
    /^(blogspot\.com|wordpress\.com|wixsite\.com|weebly\.com|blogspot\.[a-z.]+)$/i.test(rootDomain);

  const candidates: { site: GscSite; score: number; kind: MatchKind }[] = [];
  for (const s of sites) {
    let score = 0;
    let kind: MatchKind = "none";
    if (s.siteUrl.startsWith("sc-domain:")) {
      const scHost = s.siteUrl.slice("sc-domain:".length).replace(/^www\./, "").toLowerCase();
      if (scHost === host) {
        score = 95;
        kind = "exact-domain";
      } else if (!sharedSuffix && scHost === rootDomain) {
        score = 75;
        kind = "root-domain";
      } else if (!sharedSuffix && host.endsWith("." + scHost)) {
        score = 55;
        kind = "subdomain";
      }
    } else {
      try {
        const sh = new URL(s.siteUrl).hostname.replace(/^www\./, "").toLowerCase();
        if (sh === host) {
          score = 100;
          kind = "exact-url";
        } else if (!sharedSuffix && sh === rootDomain) {
          score = 60;
          kind = "root-domain";
        } else if (!sharedSuffix && sh.endsWith("." + rootDomain)) {
          score = 40;
          kind = "subdomain";
        }
      } catch {
        // ignore malformed entries
      }
    }
    if (score > 0) candidates.push({ site: s, score, kind });
  }
  if (candidates.length === 0) return null;

  // Prefer readable permission first, then the strongest URL match.
  candidates.sort((a, b) => {
    const pr = permissionRank(b.site.permissionLevel) - permissionRank(a.site.permissionLevel);
    if (pr !== 0) return pr;
    return b.score - a.score;
  });
  const best = candidates[0];
  return {
    siteUrl: best.site.siteUrl,
    permissionLevel: best.site.permissionLevel,
    verified: isVerifiedPermission(best.site.permissionLevel),
    matchedBy: best.kind,
  };
}

/** Back-compat thin wrapper: best matching property URL regardless of verification. */
export function matchSite(sites: GscSite[], blogUrl: string): string | null {
  return matchSiteDetailed(sites, blogUrl)?.siteUrl ?? null;
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
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    console.error("[gsc] search analytics failed", res.status, errBody);
    throw classifyGscError(res.status, errBody);
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
  return {
    payload: data.payload,
    fetchedAt: (data.updated_at as string) ?? new Date().toISOString(),
  };
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
