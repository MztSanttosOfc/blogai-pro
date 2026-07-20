// BlogAI Pro — Onda 5: helper de logging de atividades.
// Todas as instrumentações passam por public.log_user_activity (SECURITY DEFINER),
// nunca inserindo direto na tabela. Falha silenciosa — nunca bloqueia a ação principal.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type SB = SupabaseClient<Database>;

export type ActivityCategory =
  | "content"
  | "publish"
  | "image"
  | "payment"
  | "plan"
  | "credits"
  | "auth"
  | "feedback"
  | "profile"
  | "invite";

export interface ActivityLogRow {
  id: string;
  user_id: string;
  category: ActivityCategory;
  event: string;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

/** Fire-and-forget: registra um evento na timeline do usuário. */
export function logUserActivity(
  supabase: SB,
  userId: string,
  category: ActivityCategory,
  event: string,
  description?: string,
  metadata?: Record<string, unknown>,
): void {
  try {
    void (supabase.rpc as unknown as (name: string, args: Record<string, unknown>) => Promise<unknown>)(
      "log_user_activity",
      {
        _user_id: userId,
        _category: category,
        _event: event,
        _description: description ?? null,
        _metadata: metadata ?? {},
      },
    );
  } catch {
    /* silent */
  }
}

export interface ListActivityOptions {
  category?: ActivityCategory;
  since?: string; // ISO
  page?: number;
  perPage?: number;
}

export interface ListActivityResult {
  items: ActivityLogRow[];
  total: number;
  page: number;
  per_page: number;
}

export async function listActivityFor(
  supabase: SB,
  userId: string,
  opts: ListActivityOptions = {},
): Promise<ListActivityResult> {
  const page = Math.max(1, opts.page ?? 1);
  const perPage = Math.min(100, Math.max(1, opts.perPage ?? 30));
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let q = (supabase as unknown as {
    from: (t: string) => {
      select: (cols: string, o: { count: "exact" }) => {
        eq: (c: string, v: unknown) => {
          order: (c: string, o: { ascending: boolean }) => {
            range: (a: number, b: number) => Promise<{
              data: ActivityLogRow[] | null;
              count: number | null;
              error: { message: string } | null;
            }>;
            eq: (c: string, v: unknown) => unknown;
            gte: (c: string, v: unknown) => unknown;
          };
        };
      };
    };
  })
    .from("user_activity_logs")
    .select("id, user_id, category, event, description, metadata, created_at", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (opts.category) q = (q as unknown as { eq: (c: string, v: unknown) => typeof q }).eq("category", opts.category);
  if (opts.since) q = (q as unknown as { gte: (c: string, v: unknown) => typeof q }).gte("created_at", opts.since);

  const { data, count, error } = await (
    q as unknown as {
      range: (a: number, b: number) => Promise<{
        data: ActivityLogRow[] | null;
        count: number | null;
        error: { message: string } | null;
      }>;
    }
  ).range(from, to);

  if (error) throw new Error(error.message);
  return { items: data ?? [], total: count ?? 0, page, per_page: perPage };
}
