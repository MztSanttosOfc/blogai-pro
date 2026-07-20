// BlogAI Pro — Onda 5: Analytics globais (admin).
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type SB = SupabaseClient<Database>;

export interface AnalyticsOverview {
  content: {
    articles_total: number;
    articles_published: number;
    articles_scheduled: number;
    pages_total: number;
    pages_published: number;
  };
  users: {
    total: number;
    new_7d: number;
    new_30d: number;
    active_7d: number;
    active_30d: number;
    by_plan: Record<string, number>;
  };
  credits: {
    granted: number;
    purchased: number;
    consumed: number;
    avg_per_user: number;
  };
  usage: {
    articles_per_user: number;
    pages_per_user: number;
    events_24h: number;
    events_7d: number;
  };
  ai: {
    top_categories: { category: string; total: number }[];
    invites: {
      total: number;
      rewarded: number;
      credits_distributed: number;
    };
  };
}

export async function getAnalyticsOverviewFor(sb: SB): Promise<AnalyticsOverview> {
  const { data, error } = await (sb.rpc as unknown as (
    n: string,
    a: Record<string, unknown>,
  ) => Promise<{ data: AnalyticsOverview | null; error: { message: string } | null }>)(
    "analytics_user_overview",
    {},
  );
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Sem dados de analytics.");
  return data;
}
