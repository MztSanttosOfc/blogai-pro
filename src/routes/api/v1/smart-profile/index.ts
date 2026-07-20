// GET  /api/v1/smart-profile — loads authenticated user's smart profile.
// PUT  /api/v1/smart-profile — replaces/merges fields.
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { corsPreflight, jsonOk } from "@/lib/api/v1/envelope";
import { ApiError } from "@/lib/api/v1/errors";
import { withAuth } from "@/lib/api/v1/_middleware";
import { loadSmartProfile, saveSmartProfile } from "@/lib/smart-profile.server";

const LinkSchema = z.object({
  label: z.string().trim().min(1).max(80),
  url: z.string().trim().url().max(500),
});

const PutSchema = z.object({
  personal: z.record(z.string(), z.any()).optional(),
  contacts: z.record(z.string(), z.any()).optional(),
  social_links: z.record(z.string(), z.any()).optional(),
  blogger: z.record(z.string(), z.any()).optional(),
  seo_prefs: z.record(z.string(), z.any()).optional(),
  ai_prefs: z.record(z.string(), z.any()).optional(),
  default_links: z.array(LinkSchema).max(30).optional(),
  signature: z.string().max(500).nullable().optional(),
  feature_flags: z.record(z.string(), z.boolean()).optional(),
});

export const Route = createFileRoute("/api/v1/smart-profile/")({
  server: {
    handlers: {
      OPTIONS: () => corsPreflight(),
      GET: withAuth(async ({ ctx, requestId }) => {
        const profile = await loadSmartProfile(ctx.supabase, ctx.userId);
        return jsonOk(profile, { requestId });
      }),
      PUT: withAuth(async ({ ctx, request, requestId }) => {
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          throw new ApiError("invalid_body", "Corpo JSON inválido.", 400);
        }
        const parsed = PutSchema.safeParse(raw);
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
        const profile = await saveSmartProfile(ctx.supabase, ctx.userId, parsed.data);
        return jsonOk(profile, { requestId });
      }),
    },
  },
});
