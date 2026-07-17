// GET /api/v1/clusters — lista clusters salvos do usuário.
import { createFileRoute } from "@tanstack/react-router";

import { corsPreflight, jsonOk } from "@/lib/api/v1/envelope";
import { withAuth } from "@/lib/api/v1/_middleware";
import { listClustersFor } from "@/lib/clusters.server";

export const Route = createFileRoute("/api/v1/clusters/")({
  server: {
    handlers: {
      OPTIONS: () => corsPreflight(),
      GET: withAuth(async ({ ctx, requestId }) => {
        const items = await listClustersFor(ctx.supabase);
        return jsonOk(items, { requestId });
      }),
    },
  },
});
