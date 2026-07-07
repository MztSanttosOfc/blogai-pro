import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface ScheduledPostRow {
  id: string;
  article_id: string;
  article_title: string;
  scheduled_at: string;
  status: string;
  attempts: number;
  blogger_post_url: string | null;
  error: string | null;
  executed_at: string | null;
  created_at: string;
}

const ScheduleInput = z.object({
  articleId: z.string().uuid(),
  scheduledAt: z.string().datetime({ offset: true }),
});

const RescheduleInput = z.object({
  id: z.string().uuid(),
  scheduledAt: z.string().datetime({ offset: true }),
});

const IdInput = z.object({ id: z.string().uuid() });

/** List the current user's scheduled posts (with article title). */
export const listScheduledPosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ScheduledPostRow[]> => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("scheduled_posts")
      .select(
        "id, article_id, scheduled_at, status, attempts, blogger_post_url, error, executed_at, created_at, articles(title, keyword)",
      )
      .order("scheduled_at", { ascending: true });
    if (error) throw new Error("Não foi possível carregar os agendamentos.");
    return (data ?? []).map((r) => {
      const art = r.articles as { title?: string; keyword?: string } | null;
      return {
        id: r.id,
        article_id: r.article_id,
        article_title: art?.title || art?.keyword || "Artigo",
        scheduled_at: r.scheduled_at,
        status: r.status,
        attempts: r.attempts,
        blogger_post_url: r.blogger_post_url,
        error: r.error,
        executed_at: r.executed_at,
        created_at: r.created_at,
      };
    });
  });

/** Schedule an article for automatic Blogger publication. */
export const schedulePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ScheduleInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const when = new Date(data.scheduledAt);
    if (Number.isNaN(when.getTime()) || when.getTime() < Date.now() - 60_000) {
      throw new Error("Escolha uma data e horário futuros.");
    }

    // Validate ownership of the article (RLS scopes this to the user).
    const { data: article, error: aErr } = await supabase
      .from("articles")
      .select("id")
      .eq("id", data.articleId)
      .maybeSingle();
    if (aErr || !article) throw new Error("Artigo não encontrado.");

    const { data: inserted, error } = await supabase
      .from("scheduled_posts")
      .insert({
        user_id: userId,
        article_id: data.articleId,
        scheduled_at: when.toISOString(),
        status: "pending",
      })
      .select("id")
      .single();
    if (error) throw new Error("Não foi possível criar o agendamento.");
    return { id: inserted.id };
  });

/** Change the date/time of a pending scheduled post. */
export const rescheduleScheduledPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RescheduleInput.parse(input))
  .handler(async ({ data, context }) => {
    const when = new Date(data.scheduledAt);
    if (Number.isNaN(when.getTime()) || when.getTime() < Date.now() - 60_000) {
      throw new Error("Escolha uma data e horário futuros.");
    }
    const { error } = await context.supabase
      .from("scheduled_posts")
      .update({ scheduled_at: when.toISOString(), status: "pending", error: null })
      .eq("id", data.id)
      .in("status", ["pending", "failed", "canceled"]);
    if (error) throw new Error("Não foi possível reagendar.");
    return { ok: true };
  });

/** Cancel a pending scheduled post (keeps history). */
export const cancelScheduledPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => IdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("scheduled_posts")
      .update({ status: "canceled" })
      .eq("id", data.id)
      .eq("status", "pending");
    if (error) throw new Error("Não foi possível cancelar o agendamento.");
    return { ok: true };
  });

/** Delete a scheduled post entirely. */
export const deleteScheduledPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => IdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("scheduled_posts")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error("Não foi possível excluir o agendamento.");
    return { ok: true };
  });

/** Get execution logs for a scheduled post. */
export const getScheduledPostLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => IdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: logs, error } = await context.supabase
      .from("scheduled_post_logs")
      .select("id, level, message, created_at")
      .eq("scheduled_post_id", data.id)
      .order("created_at", { ascending: false });
    if (error) throw new Error("Não foi possível carregar os registros.");
    return logs ?? [];
  });
