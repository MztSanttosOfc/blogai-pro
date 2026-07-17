// GET /api/v1/seo/status — mapeamento de propriedades do Google Search Console.
// Reutiliza src/lib/seo-performance.server.ts.
import { createFileRoute } from "@tanstack/react-router";

import { corsPreflight, jsonOk } from "@/lib/api/v1/envelope";
import { withAuth } from "@/lib/api/v1/_middleware";
import { readPropertyMap } from "@/lib/seo-performance.server";

export const Route = createFileRoute("/api/v1/seo/status")({
  server: {
    handlers: {
      OPTIONS: () => corsPreflight(),
      GET: withAuth(async ({ ctx, requestId }) => {
        const mappings = await readPropertyMap(ctx.userId);
        return jsonOk(
          {
            connected_properties: mappings.length,
            properties: mappings,
          },
          { requestId },
        );
      }),
    },
  },
});
