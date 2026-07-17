// GET /api/v1/profile  — retorna o perfil completo do usuário autenticado.
// PATCH /api/v1/profile — atualiza campos permitidos (full_name).
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { corsPreflight, jsonOk } from "@/lib/api/v1/envelope";
import { ApiError } from "@/lib/api/v1/errors";
import { withAuth } from "@/lib/api/v1/_middleware";

const PatchSchema = z.object({
  full_name: z.string().trim().min(1).max(120).optional(),
});

export const Route = createFileRoute("/api/v1/profile/")({
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
        return jsonOk(data, { requestId });
      }),
      PATCH: withAuth(async ({ ctx, request, requestId }) => {
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          throw new ApiError("invalid_body", "Corpo JSON inválido.", 400);
        }
        const parsed = PatchSchema.safeParse(raw);
        if (!parsed.success) {
          throw new ApiError(
            "validation_error",
            "Dados inválidos.",
            422,
            parsed.error.issues.map((i) => ({
              field: i.path.join("."),
              message: i.message,
            })),
          );
        }
        if (Object.keys(parsed.data).length === 0) {
          throw new ApiError("invalid_body", "Nenhum campo para atualizar.", 400);
        }

        const { data, error } = await ctx.supabase
          .from("profiles")
          .update(parsed.data)
          .eq("id", ctx.userId)
          .select("id, email, full_name, plan, credits, created_at, updated_at")
          .maybeSingle();
        if (error) throw new ApiError("internal_error", error.message, 500);
        if (!data) throw new ApiError("not_found", "Perfil não encontrado.", 404);
        return jsonOk(data, { requestId });
      }),
    },
  },
});
