// Adaptadores finos createServerFn → scheduling.server.ts.
// A lógica de negócio vive em src/lib/scheduling.server.ts e é reutilizada
// pela API REST /api/v1/scheduling.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  listScheduledPostsFor,
  createScheduledPostFor,
  rescheduleScheduledPostFor,
  cancelScheduledPostFor,
  deleteScheduledPostFor,
  getScheduledPostLogsFor,
  type ScheduledPostRow,
} from "./scheduling.server";

export type { ScheduledPostRow };

const ScheduleInput = z.object({
  articleId: z.string().uuid(),
  scheduledAt: z.string().datetime({ offset: true }),
});
const RescheduleInput = z.object({
  id: z.string().uuid(),
  scheduledAt: z.string().datetime({ offset: true }),
});
const IdInput = z.object({ id: z.string().uuid() });

export const listScheduledPosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(({ context }) => listScheduledPostsFor(context.supabase));

export const schedulePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ScheduleInput.parse(input))
  .handler(({ data, context }) =>
    createScheduledPostFor(context.supabase, context.userId, data),
  );

export const rescheduleScheduledPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RescheduleInput.parse(input))
  .handler(async ({ data, context }) => {
    await rescheduleScheduledPostFor(context.supabase, data.id, data.scheduledAt);
    return { ok: true };
  });

export const cancelScheduledPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => IdInput.parse(input))
  .handler(async ({ data, context }) => {
    await cancelScheduledPostFor(context.supabase, data.id);
    return { ok: true };
  });

export const deleteScheduledPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => IdInput.parse(input))
  .handler(async ({ data, context }) => {
    await deleteScheduledPostFor(context.supabase, data.id);
    return { ok: true };
  });

export const getScheduledPostLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => IdInput.parse(input))
  .handler(({ data, context }) => getScheduledPostLogsFor(context.supabase, data.id));
