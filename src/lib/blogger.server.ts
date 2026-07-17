import { marked } from "marked";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const BLOGGER_API = "https://www.googleapis.com/blogger/v3";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

export const BLOGGER_SCOPES = [
  "https://www.googleapis.com/auth/blogger",
  "https://www.googleapis.com/auth/webmasters.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

export interface BloggerBlog {
  id: string;
  name: string;
  url: string;
}

function getClientCreds() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "Integração com o Blogger não configurada. As credenciais do Google ainda não foram adicionadas.",
    );
  }
  return { clientId, clientSecret };
}

/** Whether the Google OAuth credentials needed for the Blogger API are present. */
export function isBloggerConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/** Build the Google OAuth consent URL for Blogger access. */
export function buildAuthUrl(redirectUri: string, state: string): string {
  const { clientId } = getClientCreds();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: BLOGGER_SCOPES,
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export interface TokenResult {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
}

/** Exchange an authorization code for tokens. */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
): Promise<TokenResult> {
  const { clientId, clientSecret } = getClientCreds();
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[blogger] token exchange failed", res.status, body);
    throw new Error(`Falha ao conectar com o Google (${res.status}).`);
  }
  return (await res.json()) as TokenResult;
}

/** Refresh an access token using a stored refresh token. */
export async function refreshAccessToken(refreshToken: string): Promise<TokenResult> {
  const { clientId, clientSecret } = getClientCreds();
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[blogger] token refresh failed", res.status, body);
    throw new Error(`Falha ao renovar a sessão do Google (${res.status}).`);
  }
  return (await res.json()) as TokenResult;
}

/** Fetch the connected Google account email. */
export async function fetchGoogleEmail(accessToken: string): Promise<string | null> {
  const res = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { email?: string };
  return data.email ?? null;
}

/** List the blogs the connected user owns/administers. */
export async function fetchUserBlogs(accessToken: string): Promise<BloggerBlog[]> {
  const res = await fetch(`${BLOGGER_API}/users/self/blogs`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[blogger] list blogs failed", res.status, body);
    throw new Error(`Falha ao listar blogs (${res.status}).`);
  }
  const data = (await res.json()) as { items?: BloggerBlog[] };
  return (data.items ?? []).map((b) => ({ id: b.id, name: b.name, url: b.url }));
}

export interface PublishedPost {
  id: string;
  url: string;
}

/** Publish a post to a specific blog. Content must be HTML. */
export async function createBloggerPost(
  accessToken: string,
  blogId: string,
  title: string,
  html: string,
  labels: string[],
): Promise<PublishedPost> {
  const res = await fetch(`${BLOGGER_API}/blogs/${blogId}/posts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      kind: "blogger#post",
      title,
      content: html,
      labels: labels.length ? labels : undefined,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[blogger] publish post failed", res.status, body);
    throw new Error(`Falha ao publicar no Blogger (${res.status}).`);
  }
  const data = (await res.json()) as { id: string; url: string };
  return { id: data.id, url: data.url };
}

/** Convert article Markdown into Blogger-ready HTML. */
export function markdownToHtml(markdown: string): string {
  return marked.parse(markdown, { async: false }) as string;
}

export interface PublishedPage {
  id: string;
  url: string;
}

/**
 * Return a valid (refreshed if needed) Blogger access token for a user.
 * Server-only; used by the Pages module to publish AdSense pages.
 */
export async function getValidBloggerToken(userId: string): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: conn, error } = await supabaseAdmin
    .from("blogger_connections")
    .select("access_token, refresh_token, token_expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !conn) {
    throw new Error("Conta do Blogger não conectada. Conecte sua conta Google primeiro.");
  }

  const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at).getTime() : 0;
  if (expiresAt > Date.now() + 60_000 && conn.access_token) {
    return conn.access_token;
  }
  if (!conn.refresh_token) {
    throw new Error("Sessão do Google expirada. Reconecte sua conta.");
  }

  const refreshed = await refreshAccessToken(conn.refresh_token);
  const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
  await supabaseAdmin
    .from("blogger_connections")
    .update({ access_token: refreshed.access_token, token_expires_at: newExpiry })
    .eq("user_id", userId);
  return refreshed.access_token;
}

const TOKENINFO_URL = "https://www.googleapis.com/oauth2/v3/tokeninfo";

export interface BloggerTokenDiagnostics {
  /** A valid (refreshed if needed) access token. */
  token: string;
  /** Space-separated scopes granted to the token, when discoverable. */
  scopes: string[];
  /** Whether we had to refresh the access token on this call. */
  refreshed: boolean;
  /** Whether a refresh token is stored (needed for silent renewal). */
  hasRefreshToken: boolean;
  /** Whether the granted scopes include Search Console read access. */
  hasSearchConsoleScope: boolean;
}

const WEBMASTERS_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

/** Fetch the scopes a live access token carries (best-effort, never throws). */
async function fetchTokenScopes(accessToken: string): Promise<string[]> {
  try {
    const res = await fetch(`${TOKENINFO_URL}?access_token=${encodeURIComponent(accessToken)}`);
    if (!res.ok) return [];
    const data = (await res.json()) as { scope?: string };
    return data.scope ? data.scope.split(/\s+/).filter(Boolean) : [];
  } catch {
    return [];
  }
}

/**
 * Return a valid access token PLUS the diagnostic context the SEO panel needs:
 * whether the token was refreshed, whether a refresh token exists, and which
 * OAuth scopes were actually granted. This lets the panel self-diagnose instead
 * of showing a generic error.
 */
export async function getBloggerTokenDiagnostics(userId: string): Promise<BloggerTokenDiagnostics> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: conn, error } = await supabaseAdmin
    .from("blogger_connections")
    .select("access_token, refresh_token, token_expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !conn) {
    throw new Error("Conta do Blogger não conectada. Conecte sua conta Google primeiro.");
  }

  const hasRefreshToken = Boolean(conn.refresh_token);
  const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at).getTime() : 0;
  let token = conn.access_token ?? "";
  let refreshed = false;
  let scopes: string[] = [];

  const stillValid = expiresAt > Date.now() + 60_000 && !!conn.access_token;
  if (!stillValid) {
    if (!conn.refresh_token) {
      throw new Error("Sessão do Google expirada. Reconecte sua conta.");
    }
    const r = await refreshAccessToken(conn.refresh_token);
    token = r.access_token;
    refreshed = true;
    if (r.scope) scopes = r.scope.split(/\s+/).filter(Boolean);
    const newExpiry = new Date(Date.now() + r.expires_in * 1000).toISOString();
    await supabaseAdmin
      .from("blogger_connections")
      .update({ access_token: token, token_expires_at: newExpiry })
      .eq("user_id", userId);
  }

  if (scopes.length === 0) {
    scopes = await fetchTokenScopes(token);
  }

  return {
    token,
    scopes,
    refreshed,
    hasRefreshToken,
    hasSearchConsoleScope: scopes.length === 0 ? true : scopes.includes(WEBMASTERS_SCOPE),
  };
}

/** Create a static Blogger Page (used for About/Contact/Privacy/Terms etc.). */
export async function createBloggerPage(
  accessToken: string,
  blogId: string,
  title: string,
  html: string,
): Promise<PublishedPage> {
  const res = await fetch(`${BLOGGER_API}/blogs/${blogId}/pages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ kind: "blogger#page", title, content: html }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[blogger] create page failed", res.status, body);
    throw new Error(`Falha ao publicar a página no Blogger (${res.status}).`);
  }
  const data = (await res.json()) as { id: string; url: string };
  return { id: data.id, url: data.url };
}

/** Update an existing static Blogger Page. */
export async function updateBloggerPage(
  accessToken: string,
  blogId: string,
  pageId: string,
  title: string,
  html: string,
): Promise<PublishedPage> {
  const res = await fetch(`${BLOGGER_API}/blogs/${blogId}/pages/${pageId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ kind: "blogger#page", id: pageId, title, content: html }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[blogger] update page failed", res.status, body);
    throw new Error(`Falha ao atualizar a página no Blogger (${res.status}).`);
  }
  const data = (await res.json()) as { id: string; url: string };
  return { id: data.id, url: data.url };
}
