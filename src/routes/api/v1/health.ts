// GET /api/v1/health — status público da API (sem autenticação).
import { createFileRoute } from "@tanstack/react-router";
import { corsPreflight, jsonOk } from "@/lib/api/v1/envelope";
import { withPublic } from "@/lib/api/v1/_middleware";

export const Route = createFileRoute("/api/v1/health")({
  server: {
    handlers: {
      OPTIONS: () => corsPreflight(),
      GET: withPublic(async ({ requestId }) => {
        return jsonOk(
          {
            status: "ok",
            service: "BlogAI Pro API",
            version: "v1",
            time: new Date().toISOString(),
          },
          { requestId },
        );
      }),
    },
  },
});
