// GET /api/v1/subscriptions/current — assinatura ativa do usuário.
import { createFileRoute } from "@tanstack/react-router";

import { corsPreflight, jsonOk } from "@/lib/api/v1/envelope";
import { withAuth } from "@/lib/api/v1/_middleware";
import { getCurrentSubscriptionFor } from "@/lib/subscriptions.server";

export const Route = createFileRoute("/api/v1/subscriptions/current")({
  server: {
    handlers: {
      OPTIONS: () => corsPreflight(),
      GET: withAuth(async ({ ctx, requestId }) => {
        const sub = await getCurrentSubscriptionFor(ctx.supabase);
        return jsonOk(sub, { requestId });
      }),
    },
  },
});
