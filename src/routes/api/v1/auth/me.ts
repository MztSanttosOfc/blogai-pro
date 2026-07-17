// GET /api/v1/auth/me — retorna a identidade do usuário autenticado.
import { createFileRoute } from "@tanstack/react-router";

import { corsPreflight, jsonOk } from "@/lib/api/v1/envelope";
import { ApiError } from "@/lib/api/v1/errors";
import { withAuth } from "@/lib/api/v1/_middleware";

export const Route = createFileRoute("/api/v1/auth/me")({
  server: {
    handlers: {
      OPTIONS: () => corsPreflight(),
      GET: withAuth(async ({ ctx, requestId }) => {
        const { data, error } = await ctx.supabase
          .from("profiles")
          .select("id, email, full_name, plan, credits, created_at, updated_at")
          .eq("id", ctx.userId)
          .maybeSingle();

        if (error) throw new ApiError("internal_error", error.message, 500);
        if (!data) throw new ApiError("not_found", "Perfil não encontrado.", 404);

        return jsonOk(
          {
            id: data.id,
            email: data.email,
            full_name: data.full_name,
            plan: data.plan,
            credits: data.credits,
            created_at: data.created_at,
            updated_at: data.updated_at,
          },
          { requestId },
        );
      }),
    },
  },
});
