/**
 * Server-only worker for the "Agendamento de Publicações" feature.
 *
 * Called by the public cron endpoint (src/routes/api/public/hooks/publish-scheduled.ts)
 * on a schedule. It finds every scheduled post that is due, publishes the
 * associated article to the user's Blogger blog, records execution logs and
 * updates the scheduling status. Uses the service-role client (RLS bypassed)
 * because it runs without a user session.
 */
import {
  getValidBloggerToken,
  createBloggerPost,
  markdownToHtml,
} from "./blogger.server";

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
