// BlogAI Pro — Onda 5: server fns para timeline de atividades.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  listActivityFor,
  logUserActivity,
  type ActivityCategory,
  type ListActivityResult,
} from "./activity.server";

const CategoryEnum = z.enum([
  "content",
  "publish",
  "image",
  "payment",
  "plan",
  "credits",
  "auth",
  "feedback",
  "profile",
  "invite",
]);

const ListSchema = z.object({
  category: CategoryEnum.optional(),
  since: z.string().datetime().optional(),
  page: z.number().int().min(1).max(1000).optional(),
  per_page: z.number().int().min(1).max(100).optional(),
});

export const listMyActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => ListSchema.parse(raw ?? {}))
  .handler(async ({ data, context }): Promise<ListActivityResult> => {
    return listActivityFor(context.supabase, context.userId, {
      category: data.category as ActivityCategory | undefined,
      since: data.since,
      page: data.page,
      perPage: data.per_page,
    });
  });

const LogSchema = z.object({
  category: CategoryEnum,
  event: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/** Endpoint para logar eventos client-side (login, ações UI-only). */
export const logActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => LogSchema.parse(raw))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    logUserActivity(
      context.supabase,
      context.userId,
      data.category as ActivityCategory,
      data.event,
      data.description,
      data.metadata,
    );
    return { ok: true };
  });
