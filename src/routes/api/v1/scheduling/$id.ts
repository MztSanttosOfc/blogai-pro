// DELETE /api/v1/scheduling/:id — remove um agendamento.
import { createFileRoute } from "@tanstack/react-router";

import { corsPreflight, jsonOk } from "@/lib/api/v1/envelope";
import { withAuth } from "@/lib/api/v1/_middleware";
import { deleteScheduledPostFor } from "@/lib/scheduling.server";

export const Route = createFileRoute("/api/v1/scheduling/$id")({
  server: {
    handlers: {
      OPTIONS: () => corsPreflight(),
      DELETE: withAuth(async ({ ctx, request, requestId }) => {
        const id = new URL(request.url).pathname.split("/").pop() ?? "";
        await deleteScheduledPostFor(ctx.supabase, id);
        return jsonOk({ deleted: true, id }, { requestId });
      }),
    },
  },
});
