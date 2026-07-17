// Fonte única para assinatura atual do usuário.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type SB = SupabaseClient<Database>;

export interface CurrentSubscription {
  plan_id: string;
  status: string;
  started_at: string | null;
  current_period_end: string | null;
}

export async function getCurrentSubscriptionFor(
  supabase: SB,
): Promise<CurrentSubscription | null> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("plan_id, status, started_at, current_period_end")
    .maybeSingle();
  if (error) throw new Error("Não foi possível carregar a assinatura.");
  return (data as CurrentSubscription | null) ?? null;
}
