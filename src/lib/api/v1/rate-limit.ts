// BlogAI Pro — API Oficial v1: rate limiting.
// Estratégia: janela deslizante de 60s contada em `api_request_logs`.
// Limite por API Key (rate_limit_per_minute) ou por plano do usuário (JWT).

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { ApiError } from "./errors";

const DEFAULT_LIMITS_BY_PLAN: Record<string, number> = {
  free: 30,
  teste: 30,
  pro: 120,
  premium: 240,
};

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset_seconds: number;
}

export async function checkRateLimit(
  admin: SupabaseClient<Database>,
  opts: { userId: string; apiKeyId: string | null; limitOverride?: number },
): Promise<RateLimitInfo> {
  const since = new Date(Date.now() - 60_000).toISOString();

  let limit = opts.limitOverride;
  if (!limit) {
    // Fallback pelo plano do usuário quando é chamada via JWT.
    const { data } = await admin
      .from("profiles")
      .select("plan")
      .eq("id", opts.userId)
      .maybeSingle();
    const plan = (data?.plan as string | undefined) ?? "free";
    limit = DEFAULT_LIMITS_BY_PLAN[plan] ?? DEFAULT_LIMITS_BY_PLAN.free;
  }

  const { data: count } = await admin.rpc("api_count_recent_requests", {
    p_user_id: opts.userId,
    p_api_key_id: opts.apiKeyId as unknown as string,
    p_since: since,
  });

  const used = typeof count === "number" ? count : 0;
  const remaining = Math.max(0, limit - used);

  if (used >= limit) {
    throw new ApiError(
      "rate_limited",
      `Limite de ${limit} requisições por minuto excedido. Tente novamente em instantes.`,
      429,
    );
  }

  return { limit, remaining, reset_seconds: 60 };
}

export function rateLimitHeaders(info: RateLimitInfo): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(info.limit),
    "X-RateLimit-Remaining": String(info.remaining),
    "X-RateLimit-Reset": String(info.reset_seconds),
  };
}
