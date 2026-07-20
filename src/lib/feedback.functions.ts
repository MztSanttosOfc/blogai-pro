// BlogAI Pro — v1.1 Feedback: server functions.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  createFeedback,
  deleteMyFeedback,
  listMyFeedback,
  adminListFeedback,
  adminReplyFeedback,
  adminDeleteFeedback,
  type FeedbackRow,
  type FeedbackWithProfile,
} from "./feedback.server";

const CreateSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional().nullable(),
  suggestion: z.string().trim().max(2000).optional().nullable(),
  issue: z.string().trim().max(2000).optional().nullable(),
});

const IdSchema = z.object({ id: z.string().uuid() });

const ListAdminSchema = z.object({
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional(),
  minRating: z.number().int().min(1).max(5).optional(),
  maxRating: z.number().int().min(1).max(5).optional(),
});

const ReplySchema = z.object({
  id: z.string().uuid(),
  reply: z.string().trim().min(1).max(4000),
});

async function assertAdmin(context: {
  supabase: import("@supabase/supabase-js").SupabaseClient<
    import("@/integrations/supabase/types").Database
  >;
  userId: string;
}) {
  const { data, error } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("forbidden");
}

export const submitFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => CreateSchema.parse(raw))
  .handler(async ({ data, context }): Promise<FeedbackRow> => {
    return createFeedback(context.supabase, context.userId, data);
  });

export const listMyFeedbacks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FeedbackRow[]> => {
    return listMyFeedback(context.supabase, context.userId);
  });

export const deleteFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => IdSchema.parse(raw))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await deleteMyFeedback(context.supabase, context.userId, data.id);
    return { ok: true };
  });

// ---------- Admin ----------

export interface FeedbackStats {
  total: number;
  average_rating: number;
  by_rating: Record<string, number>;
  pending: number;
  replied: number;
}

export const adminFeedbackStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FeedbackStats> => {
    await assertAdmin(context);
    const { data, error } = await context.supabase.rpc("admin_feedback_stats");
    if (error) throw new Error(error.message);
    return (
      (data as unknown as FeedbackStats) ?? {
        total: 0,
        average_rating: 0,
        by_rating: {},
        pending: 0,
        replied: 0,
      }
    );
  });

export const adminListFeedbacks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => ListAdminSchema.parse(raw ?? {}))
  .handler(async ({ data, context }): Promise<FeedbackWithProfile[]> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return adminListFeedback(supabaseAdmin, data);
  });

export const adminReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => ReplySchema.parse(raw))
  .handler(async ({ data, context }): Promise<FeedbackRow> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return adminReplyFeedback(supabaseAdmin, context.userId, data.id, data.reply);
  });

export const adminRemoveFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => IdSchema.parse(raw))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await adminDeleteFeedback(supabaseAdmin, data.id);
    return { ok: true };
  });
