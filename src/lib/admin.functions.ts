import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface AdminUserRow {
  id: string;
  email: string | null;
  full_name: string | null;
  plan: "free" | "pro" | "premium" | "teste";
  credits: number;
  created_at: string;
  subscription_status: string;
  last_sign_in_at: string | null;
  role: "owner" | "admin" | "user" | null;
}

export interface AdminStats {
  total_users: number;
  free_users: number;
  pro_users: number;
  premium_users: number;
  teste_users: number;
  total_payments: number;
  total_revenue_cents: number;
  credits_distributed: number;
  credits_consumed: number;
  new_users_7d: number;
  new_users_30d: number;
  total_articles: number;
}

export interface AdminAuditLog {
  id: string;
  action: string;
  admin_email: string | null;
  target_email: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  details: string | null;
  created_at: string;
}

async function assertAdmin(supabase: ReturnType<typeof Object>, userId: string): Promise<void> {
  // RLS-safe: is_admin is a security-definer helper.
  const { data, error } = await (supabase as never as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: boolean | null; error: unknown }>;
  }).rpc("is_admin", { _user_id: userId });
  if (error || !data) throw new Error("Acesso restrito a administradores.");
}

/** Returns the current user's role (null if a regular user). */
export const getMyRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const roles = (data ?? []).map((r) => r.role);
    const role = roles.includes("owner")
      ? "owner"
      : roles.includes("admin")
        ? "admin"
        : null;
    return { role, isAdmin: role !== null };
  });

/** Lists every registered user with plan, credits and access details (admin only). */
export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase.rpc("admin_list_users");
    if (error) throw new Error("Não foi possível carregar os usuários.");
    return { users: (data ?? []) as unknown as AdminUserRow[] };
  });

/** Aggregated platform statistics (admin only). */
export const adminGetStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase.rpc("admin_stats");
    if (error) throw new Error("Não foi possível carregar as estatísticas.");
    return { stats: data as unknown as AdminStats };
  });

const SetPlanInput = z.object({
  userId: z.string().uuid(),
  plan: z.enum(["free", "pro", "premium", "teste"]),
});

/** Manually change a user's plan (admin only, audited). */
export const adminSetPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SetPlanInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.rpc("admin_set_plan", {
      p_user_id: data.userId,
      p_plan: data.plan,
    });
    if (error) throw new Error("Falha ao alterar o plano do usuário.");
    return { ok: true };
  });

const AdjustCreditsInput = z.object({
  userId: z.string().uuid(),
  mode: z.enum(["add", "remove", "set"]),
  amount: z.number().int().min(0).max(9999999),
  reason: z.string().trim().max(300).optional(),
});

/** Add, remove, or set a user's credits (admin only, audited). */
export const adminAdjustCredits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AdjustCreditsInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.rpc("admin_adjust_credits", {
      p_user_id: data.userId,
      p_mode: data.mode,
      p_amount: data.amount,
      p_reason: data.reason ?? null,
    });
    if (error) throw new Error("Falha ao ajustar os créditos.");
    return { ok: true };
  });

/** Returns the most recent admin audit log entries (admin only). */
export const adminListAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase.rpc("admin_list_audit_logs", { p_limit: 200 });
    if (error) throw new Error("Não foi possível carregar os logs.");
    return { logs: (data ?? []) as unknown as AdminAuditLog[] };
  });
