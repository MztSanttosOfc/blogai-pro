// GET /api/v1/plans — lista pública dos planos ativos do BlogAI Pro.
// Endpoint público (sem Bearer). Usa o client publishable server-side.
import { createFileRoute } from "@tanstack/react-router";

import { corsPreflight, jsonOk } from "@/lib/api/v1/envelope";
import { ApiError } from "@/lib/api/v1/errors";
import { createServerPublishableClient, withPublic } from "@/lib/api/v1/_middleware";

export const Route = createFileRoute("/api/v1/plans/")({
  server: {
    handlers: {
      OPTIONS: () => corsPreflight(),
      GET: withPublic(async ({ requestId }) => {
        const supabase = createServerPublishableClient();
        const { data, error } = await supabase
          .from("plans")
          .select("id, name, price_cents, monthly_credits, is_unlimited, features, sort_order")
          .eq("active", true)
          .order("sort_order", { ascending: true });
        if (error) throw new ApiError("internal_error", error.message, 500);
        return jsonOk(data ?? [], { requestId });
      }),
    },
  },
});
