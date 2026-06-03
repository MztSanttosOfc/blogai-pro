import { marked } from "marked";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const BLOGGER_API = "https://www.googleapis.com/blogger/v3";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

export const BLOGGER_SCOPES = [
  "https://www.googleapis.com/auth/blogger",
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
    const body = await res.text();
    throw new Error(`Falha ao conectar com o Google (${res.status}): ${body}`);
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
    const body = await res.text();
    throw new Error(`Falha ao renovar a sessão do Google (${res.status}): ${body}`);
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
    const body = await res.text();
    throw new Error(`Falha ao listar blogs (${res.status}): ${body}`);
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
    const body = await res.text();
    throw new Error(`Falha ao publicar no Blogger (${res.status}): ${body}`);
  }
  const data = (await res.json()) as { id: string; url: string };
  return { id: data.id, url: data.url };
}

/** Convert article Markdown into Blogger-ready HTML. */
export function markdownToHtml(markdown: string): string {
  return marked.parse(markdown, { async: false }) as string;
}
