// BlogAI Pro — Onda 5: server fn de analytics (admin-only via RPC gate).
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getAnalyticsOverviewFor, type AnalyticsOverview } from "./analytics.server";

export const getAnalyticsOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AnalyticsOverview> => {
    return getAnalyticsOverviewFor(context.supabase);
  });
