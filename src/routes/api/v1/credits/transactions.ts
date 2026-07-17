// GET /api/v1/credits/transactions — histórico de créditos do usuário.
import { createFileRoute } from "@tanstack/react-router";

import { corsPreflight, jsonOk } from "@/lib/api/v1/envelope";
import { withAuth } from "@/lib/api/v1/_middleware";
import { listCreditTransactionsFor } from "@/lib/credits.server";
import { parseListParams } from "@/lib/api/v1/pagination";

export const Route = createFileRoute("/api/v1/credits/transactions")({
  server: {
    handlers: {
      OPTIONS: () => corsPreflight(),
      GET: withAuth(async ({ ctx, url, requestId }) => {
        const params = parseListParams(url);
        const items = await listCreditTransactionsFor(ctx.supabase, {
          limit: params.per_page,
        });
        return jsonOk(items, { requestId });
      }),
    },
  },
});
