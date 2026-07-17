// GET /api/v1/articles/:id — detalhes de um artigo.
// DELETE /api/v1/articles/:id — remove o artigo do usuário.
import { createFileRoute } from "@tanstack/react-router";

import { corsPreflight, jsonOk } from "@/lib/api/v1/envelope";
import { ApiError } from "@/lib/api/v1/errors";
import { withAuth } from "@/lib/api/v1/_middleware";
import { deleteArticleFor, getArticleFor } from "@/lib/articles.server";

export const Route = createFileRoute("/api/v1/articles/$id")({
  server: {
    handlers: {
      OPTIONS: () => corsPreflight(),
      GET: withAuth(async ({ ctx, requestId, request }) => {
        const id = new URL(request.url).pathname.split("/").pop() ?? "";
        const article = await getArticleFor(ctx.supabase, id);
        if (!article) throw new ApiError("not_found", "Artigo não encontrado.", 404);
        return jsonOk(article, { requestId });
      }),
      DELETE: withAuth(async ({ ctx, requestId, request }) => {
        const id = new URL(request.url).pathname.split("/").pop() ?? "";
        await deleteArticleFor(ctx.supabase, id);
        return jsonOk({ deleted: true, id }, { requestId });
      }),
    },
  },
});
