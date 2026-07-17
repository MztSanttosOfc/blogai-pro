// GET /api/v1/credits — saldo atual de créditos do usuário.
import { createFileRoute } from "@tanstack/react-router";

import { corsPreflight, jsonOk } from "@/lib/api/v1/envelope";
import { withAuth } from "@/lib/api/v1/_middleware";
import { getCreditsBalanceFor } from "@/lib/credits.server";

export const Route = createFileRoute("/api/v1/credits/")({
  server: {
    handlers: {
      OPTIONS: () => corsPreflight(),
      GET: withAuth(async ({ ctx, requestId }) => {
        const balance = await getCreditsBalanceFor(ctx.supabase, ctx.userId);
        return jsonOk(balance, { requestId });
      }),
    },
  },
});
