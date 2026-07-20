// BlogAI Pro — Onda 5: Sistema de Convites — camada server-only.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type SB = SupabaseClient<Database>;

export interface InviteRedemptionRow {
  id: string;
  inviter_id: string;
  invitee_id: string;
  code: string;
  status: "pending" | "qualified" | "rewarded";
  credits_awarded: number;
  qualified_at: string | null;
  rewarded_at: string | null;
  created_at: string;
}

export interface InviteStatus {
  code: string;
  invite_link: string;
  totals: {
    total: number;
    rewarded: number;
    pending: number;
    credits_earned: number;
  };
  history: (InviteRedemptionRow & { invitee_email?: string | null })[];
}

// Wrapper util para chamadas rpc não tipadas no gen types.
function rpc<T = unknown>(sb: SB, name: string, args: Record<string, unknown>): Promise<{ data: T | null; error: { message: string } | null }> {
  return (sb.rpc as unknown as (
    n: string,
    a: Record<string, unknown>,
  ) => Promise<{ data: T | null; error: { message: string } | null }>)(name, args);
}

export async function ensureCodeFor(sb: SB): Promise<string> {
  const { data, error } = await rpc<string>(sb, "ensure_invite_code", {});
  if (error) throw new Error(error.message);
  return data ?? "";
}

export async function redeemCodeFor(
  sb: SB,
  code: string,
): Promise<{ ok: boolean; reason?: string; inviter_id?: string }> {
  const { data, error } = await rpc<{ ok: boolean; reason?: string; inviter_id?: string }>(
    sb,
    "invite_redeem",
    { _code: code },
  );
  if (error) throw new Error(error.message);
  return data ?? { ok: false, reason: "unknown" };
}

/** Idempotente: só recompensa quando o convidado já tem ≥1 artigo. */
export async function autoQualifyInvite(
  sb: SB,
  inviteeUserId: string,
): Promise<{ ok: boolean; skipped?: boolean; reason?: string; credits?: number }> {
  const { data: red } = await (sb as unknown as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (col: string, v: string) => { maybeSingle: () => Promise<{ data: { status: string } | null }> };
      };
    };
  })
    .from("invite_redemptions")
    .select("status")
    .eq("invitee_id", inviteeUserId)
    .maybeSingle();

  if (!red) return { ok: true, skipped: true, reason: "not_invited" };
  if (red.status === "rewarded") return { ok: true, skipped: true, reason: "already_rewarded" };

  const { count } = await (sb as unknown as {
    from: (t: string) => {
      select: (c: string, o: { count: "exact"; head: true }) => {
        eq: (col: string, v: string) => Promise<{ count: number | null }>;
      };
    };
  })
    .from("articles")
    .select("id", { count: "exact", head: true })
    .eq("user_id", inviteeUserId);

  if (!count || count < 1) return { ok: true, skipped: true, reason: "no_articles" };

  const { data, error } = await rpc<{ ok: boolean; credits?: number }>(
    sb,
    "invite_qualify_and_reward",
    { _invitee_id: inviteeUserId },
  );
  if (error) throw new Error(error.message);
  return data ?? { ok: false };
}

export async function getInviteStatusFor(sb: SB, userId: string, origin: string): Promise<InviteStatus> {
  const code = await ensureCodeFor(sb);

  const { data: rows, error } = await (sb as unknown as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (col: string, v: string) => {
          order: (col: string, o: { ascending: boolean }) => Promise<{
            data: InviteRedemptionRow[] | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
  })
    .from("invite_redemptions")
    .select("id, inviter_id, invitee_id, code, status, credits_awarded, qualified_at, rewarded_at, created_at")
    .eq("inviter_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const history = rows ?? [];
  const totals = {
    total: history.length,
    rewarded: history.filter((r) => r.status === "rewarded").length,
    pending: history.filter((r) => r.status !== "rewarded").length,
    credits_earned: history.reduce((s, r) => s + (r.credits_awarded ?? 0), 0),
  };

  return {
    code,
    invite_link: `${origin}/signup?ref=${code}`,
    totals,
    history,
  };
}
