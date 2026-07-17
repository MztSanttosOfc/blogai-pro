// GET /api/v1/articles — lista artigos do usuário autenticado.
import { createFileRoute } from "@tanstack/react-router";

import { corsPreflight, jsonOk } from "@/lib/api/v1/envelope";
import { ApiError } from "@/lib/api/v1/errors";
import { withAuth } from "@/lib/api/v1/_middleware";
import { parseListParams, buildPagination } from "@/lib/api/v1/pagination";
import { listArticlesFor } from "@/lib/articles.server";

export const Route = createFileRoute("/api/v1/articles/")({
  server: {
    handlers: {
      OPTIONS: () => corsPreflight(),
      GET: withAuth(async ({ ctx, url, requestId }) => {
        const params = parseListParams(url);
        try {
          const { items, total } = await listArticlesFor(ctx.supabase, {
            limit: params.per_page,
            offset: (params.page - 1) * params.per_page,
            search: params.search,
          });
          return jsonOk(items, {
            requestId,
            pagination: buildPagination(params, total),
          });
        } catch (err) {
          throw new ApiError("internal_error", (err as Error).message, 500);
        }
      }),
    },
  },
});
