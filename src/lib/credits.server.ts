// Fonte única para saldo e histórico de créditos.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type SB = SupabaseClient<Database>;

export interface CreditsBalance {
  credits: number;
  plan: string;
}

export interface CreditTransactionRow {
  id: string;
  type: string;
  amount: number;
  balance_after: number;
  description: string | null;
  created_at: string;
}

export async function getCreditsBalanceFor(
  supabase: SB,
  userId: string,
): Promise<CreditsBalance> {
  const { data, error } = await supabase
    .from("profiles")
    .select("credits, plan")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error("Não foi possível carregar o saldo de créditos.");
  if (!data) throw new Error("Perfil não encontrado.");
  return { credits: data.credits, plan: String(data.plan) };
}

export async function listCreditTransactionsFor(
  supabase: SB,
  opts: { limit?: number } = {},
): Promise<CreditTransactionRow[]> {
  const limit = Math.min(200, Math.max(1, opts.limit ?? 50));
  const { data, error } = await supabase
    .from("credit_transactions")
    .select("id, type, amount, balance_after, description, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error("Não foi possível carregar o histórico de créditos.");
  return (data ?? []) as CreditTransactionRow[];
}
