import { createFileRoute } from "@tanstack/react-router";

/**
 * Cron endpoint that publishes due scheduled posts to Blogger.
 *
 * Called by pg_cron every minute via pg_net. Lives under /api/public/* so it
 * bypasses the published-site auth wall. It performs no destructive action
 * based on user input — it only processes rows already stored by authenticated
 * users — so it is safe to expose. An optional apikey header is accepted for
 * parity with the pg_cron call but the endpoint is idempotent.
 */
export const Route = createFileRoute("/api/public/hooks/publish-scheduled")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const { runScheduledPublishing } = await import("@/lib/scheduling.server");
          const result = await runScheduledPublishing();
          return Response.json({ ok: true, ...result });
        } catch (err) {
          const message = err instanceof Error ? err.message : "unknown error";
          console.error("[cron:publish-scheduled]", message);
          return Response.json({ ok: false, error: message }, { status: 500 });
        }
      },
    },
  },
});
