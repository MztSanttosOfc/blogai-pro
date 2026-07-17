// DELETE /api/v1/clusters/:id — remove um cluster salvo.
import { createFileRoute } from "@tanstack/react-router";

import { corsPreflight, jsonOk } from "@/lib/api/v1/envelope";
import { withAuth } from "@/lib/api/v1/_middleware";
import { deleteClusterFor } from "@/lib/clusters.server";

export const Route = createFileRoute("/api/v1/clusters/$id")({
  server: {
    handlers: {
      OPTIONS: () => corsPreflight(),
      DELETE: withAuth(async ({ ctx, request, requestId }) => {
        const id = new URL(request.url).pathname.split("/").pop() ?? "";
        await deleteClusterFor(ctx.supabase, id);
        return jsonOk({ deleted: true, id }, { requestId });
      }),
    },
  },
});
