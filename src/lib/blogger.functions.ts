import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  buildAuthUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  fetchGoogleEmail,
  fetchUserBlogs,
  createBloggerPost,
  markdownToHtml,
  isBloggerConfigured,
  type BloggerBlog,
} from "./blogger.server";

/** Returns a valid (refreshed if needed) access token for the user. */
async function getValidAccessToken(userId: string): Promise<string> {
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
  const stillValid = expiresAt > Date.now() + 60_000;
  if (stillValid && conn.access_token) {
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

/** Build the Google OAuth consent URL to grant Blogger access. */
export const getBloggerAuthUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        redirectUri: z.string().url().max(500),
        state: z.string().min(8).max(128),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    return { url: buildAuthUrl(data.redirectUri, data.state) };
  });

/** Exchange the OAuth code, store tokens, and load the user's blogs. */
export const connectBlogger = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        code: z.string().min(10).max(2000),
        redirectUri: z.string().url().max(500),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const tokens = await exchangeCodeForTokens(data.code, data.redirectUri);
    const email = await fetchGoogleEmail(tokens.access_token);
    const blogs = await fetchUserBlogs(tokens.access_token);
    const expiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Preserve a previously selected blog if still available.
    const { data: existing } = await supabaseAdmin
      .from("blogger_connections")
      .select("selected_blog_id, refresh_token")
      .eq("user_id", userId)
      .maybeSingle();

    let selectedBlogId = existing?.selected_blog_id ?? null;
    let selectedBlogName: string | null = null;
    if (selectedBlogId) {
      const match = blogs.find((b) => b.id === selectedBlogId);
      selectedBlogId = match ? match.id : null;
      selectedBlogName = match ? match.name : null;
    }
    // Auto-select when the user has exactly one blog.
    if (!selectedBlogId && blogs.length === 1) {
      selectedBlogId = blogs[0].id;
      selectedBlogName = blogs[0].name;
    }

    const { error } = await supabaseAdmin.from("blogger_connections").upsert(
      {
        user_id: userId,
        google_email: email,
        access_token: tokens.access_token,
        // Google only returns a refresh_token on first consent; keep the old one otherwise.
        refresh_token: tokens.refresh_token ?? existing?.refresh_token ?? null,
        token_expires_at: expiry,
        selected_blog_id: selectedBlogId,
        selected_blog_name: selectedBlogName,
      },
      { onConflict: "user_id" },
    );

    if (error) throw new Error("Não foi possível salvar a conexão com o Blogger.");

    return { email, blogs, selectedBlogId, selectedBlogName };
  });

/** Returns the current Blogger connection status (no tokens exposed). */
export const getBloggerStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const configured = isBloggerConfigured();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: conn } = await supabaseAdmin
      .from("blogger_connections")
      .select("google_email, selected_blog_id, selected_blog_name")
      .eq("user_id", context.userId)
      .maybeSingle();

    return {
      configured,
      connected: !!conn,
      email: conn?.google_email ?? null,
      selectedBlogId: conn?.selected_blog_id ?? null,
      selectedBlogName: conn?.selected_blog_name ?? null,
    };
  });

/** List the connected user's blogs. */
export const listBloggerBlogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ blogs: BloggerBlog[] }> => {
    const token = await getValidAccessToken(context.userId);
    const blogs = await fetchUserBlogs(token);
    return { blogs };
  });

/** Choose the destination blog for publishing. */
export const selectBloggerBlog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        blogId: z.string().min(1).max(60),
        blogName: z.string().min(1).max(200),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("blogger_connections")
      .update({ selected_blog_id: data.blogId, selected_blog_name: data.blogName })
      .eq("user_id", context.userId);
    if (error) throw new Error("Não foi possível selecionar o blog.");
    return { ok: true };
  });

/** Remove the Blogger connection. */
export const disconnectBlogger = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("blogger_connections")
      .delete()
      .eq("user_id", context.userId);
    if (error) throw new Error("Não foi possível desconectar a conta.");
    return { ok: true };
  });

/** Publish a saved article directly to the user's selected Blogger blog. */
export const publishArticleToBlogger = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ articleId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Load the article (RLS scopes this to the current user).
    const { data: article, error: articleError } = await supabase
      .from("articles")
      .select("id, title, content, tags, keyword")
      .eq("id", data.articleId)
      .maybeSingle();
    if (articleError || !article) throw new Error("Artigo não encontrado.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: conn } = await supabaseAdmin
      .from("blogger_connections")
      .select("selected_blog_id, selected_blog_name")
      .eq("user_id", userId)
      .maybeSingle();

    if (!conn?.selected_blog_id) {
      throw new Error("Selecione um blog de destino antes de publicar.");
    }

    const token = await getValidAccessToken(userId);
    const html = markdownToHtml(article.content || "");
    const title = article.title || article.keyword || "Sem título";
    const labels = Array.isArray(article.tags) ? (article.tags as string[]) : [];

    const post = await createBloggerPost(token, conn.selected_blog_id, title, html, labels);

    // Persist the published post reference + status (RLS scoped).
    const { error: updateError } = await supabase
      .from("articles")
      .update({
        status: "published",
        blogger_post_id: post.id,
        blogger_post_url: post.url,
      })
      .eq("id", data.articleId);
    if (updateError) throw new Error("Publicado, mas falha ao atualizar o status do artigo.");

    return { url: post.url, postId: post.id, blogName: conn.selected_blog_name };
  });
