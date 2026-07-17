// DELETE /api/v1/api-keys/:id — revoga a chave (marca revoked_at).
import { createFileRoute } from "@tanstack/react-router";
import { corsPreflight, jsonOk } from "@/lib/api/v1/envelope";
import { ApiError } from "@/lib/api/v1/errors";
import { withAuth } from "@/lib/api/v1/_middleware";

export const Route = createFileRoute("/api/v1/api-keys/$id")({
  server: {
    handlers: {
      OPTIONS: () => corsPreflight(),
      DELETE: withAuth(async ({ ctx, request, requestId }) => {
        if (ctx.authType === "api_key") {
          throw new ApiError("forbidden", "API Keys não podem revogar chaves.", 403);
        }
        const id = new URL(request.url).pathname.split("/").pop()!;
        const { data, error } = await ctx.supabase
          .from("api_keys")
          .update({ revoked_at: new Date().toISOString() })
          .eq("id", id)
          .eq("user_id", ctx.userId)
          .select("id, revoked_at")
          .maybeSingle();
        if (error) throw new ApiError("internal_error", error.message, 500);
        if (!data) throw new ApiError("not_found", "API Key não encontrada.", 404);
        return jsonOk({ id: data.id, revoked_at: data.revoked_at }, { requestId });
      }),
    },
  },
});
