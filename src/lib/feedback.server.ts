// BlogAI Pro — v1.1 Feedback: server-only helpers.
// Nunca importar diretamente do cliente. Use `feedback.functions.ts`.
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

export type FeedbackRow = Database["public"]["Tables"]["user_feedback"]["Row"];

export interface FeedbackInput {
  rating: number;
  comment?: string | null;
  suggestion?: string | null;
  issue?: string | null;
}

export interface FeedbackWithProfile extends FeedbackRow {
  user_email?: string | null;
  user_name?: string | null;
}

export interface FeedbackListOptions {
  limit?: number;
  offset?: number;
  minRating?: number;
  maxRating?: number;
}

export async function createFeedback(
  supabase: SupabaseClient<Database>,
  userId: string,
  input: FeedbackInput,
): Promise<FeedbackRow> {
  const { data, error } = await supabase
    .from("user_feedback")
    .insert({
      user_id: userId,
      rating: input.rating,
      comment: input.comment ?? null,
      suggestion: input.suggestion ?? null,
      issue: input.issue ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listMyFeedback(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<FeedbackRow[]> {
  const { data, error } = await supabase
    .from("user_feedback")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function deleteMyFeedback(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("user_feedback")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

/**
 * Lista feedbacks para admin. Requer que o chamador seja admin — validado
 * antes via `is_admin` RPC. Usa client admin (service role) para join com
 * profiles.
 */
export async function adminListFeedback(
  supabaseAdmin: SupabaseClient<Database>,
  opts: FeedbackListOptions = {},
): Promise<FeedbackWithProfile[]> {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const offset = Math.max(opts.offset ?? 0, 0);

  let query = supabaseAdmin
    .from("user_feedback")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (typeof opts.minRating === "number") query = query.gte("rating", opts.minRating);
  if (typeof opts.maxRating === "number") query = query.lte("rating", opts.maxRating);

  const { data: rows, error } = await query;
  if (error) throw error;
  const items = rows ?? [];

  if (items.length === 0) return [];
  const ids = Array.from(new Set(items.map((r) => r.user_id)));
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, email, full_name")
    .in("id", ids);
  const map = new Map((profiles ?? []).map((p) => [p.id, p]));
  return items.map((r) => {
    const p = map.get(r.user_id);
    return {
      ...r,
      user_email: p?.email ?? null,
      user_name: p?.full_name ?? null,
    };
  });
}

export async function adminReplyFeedback(
  supabaseAdmin: SupabaseClient<Database>,
  adminId: string,
  id: string,
  reply: string,
): Promise<FeedbackRow> {
  const { data, error } = await supabaseAdmin
    .from("user_feedback")
    .update({
      admin_reply: reply,
      admin_reply_at: new Date().toISOString(),
      admin_reply_by: adminId,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function adminDeleteFeedback(
  supabaseAdmin: SupabaseClient<Database>,
  id: string,
): Promise<void> {
  const { error } = await supabaseAdmin.from("user_feedback").delete().eq("id", id);
  if (error) throw error;
}
