// GET  /api/v1/api-keys       — lista as chaves do usuário.
// POST /api/v1/api-keys       — cria uma nova chave (token só é retornado uma vez).
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { corsPreflight, jsonOk } from "@/lib/api/v1/envelope";
import { ApiError } from "@/lib/api/v1/errors";
import { withAuth } from "@/lib/api/v1/_middleware";
import { generateApiKey } from "@/lib/api/v1/api-keys.server";

const CreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  scopes: z.array(z.string().min(1)).max(20).optional(),
  rate_limit_per_minute: z.number().int().min(10).max(600).optional(),
  expires_at: z.string().datetime().optional(),
});

export const Route = createFileRoute("/api/v1/api-keys/")({
  server: {
    handlers: {
      OPTIONS: () => corsPreflight(),

      GET: withAuth(async ({ ctx, requestId }) => {
        // API Keys nunca podem criar/listar outras API Keys (segurança).
        if (ctx.authType === "api_key") {
          throw new ApiError("forbidden", "API Keys não podem gerenciar chaves.", 403);
        }
        const { data, error } = await ctx.supabase
          .from("api_keys")
          .select(
            "id, name, prefix, scopes, rate_limit_per_minute, last_used_at, expires_at, revoked_at, created_at",
          )
          .eq("user_id", ctx.userId)
          .order("created_at", { ascending: false });
        if (error) throw new ApiError("internal_error", error.message, 500);
        return jsonOk(data ?? [], { requestId });
      }),

      POST: withAuth(async ({ ctx, request, requestId }) => {
        if (ctx.authType === "api_key") {
          throw new ApiError("forbidden", "API Keys não podem criar chaves.", 403);
        }
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          throw new ApiError("invalid_body", "Corpo JSON inválido.", 400);
        }
        const parsed = CreateSchema.safeParse(raw);
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

        const generated = await generateApiKey();
        const { data, error } = await ctx.supabase
          .from("api_keys")
          .insert({
            user_id: ctx.userId,
            name: parsed.data.name,
            prefix: generated.prefix,
            key_hash: generated.key_hash,
            scopes: parsed.data.scopes ?? ["*"],
            rate_limit_per_minute: parsed.data.rate_limit_per_minute ?? 60,
            expires_at: parsed.data.expires_at ?? null,
          })
          .select("id, name, prefix, scopes, rate_limit_per_minute, expires_at, created_at")
          .maybeSingle();
        if (error || !data) {
          throw new ApiError("internal_error", error?.message ?? "Erro ao criar chave.", 500);
        }

        return jsonOk({ ...data, token: generated.token }, { requestId, status: 201 });
      }),
    },
  },
});
