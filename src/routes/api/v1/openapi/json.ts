// GET /api/v1/openapi.json — especificação OpenAPI 3.1 pública.
// Espelha os endpoints implementados e serve como fonte para gerar
// SDKs (PHP, TypeScript, etc.).
import { createFileRoute } from "@tanstack/react-router";
import { corsPreflight } from "@/lib/api/v1/envelope";
import { withPublic } from "@/lib/api/v1/_middleware";
import { buildOpenApiDocument } from "@/lib/api/v1/openapi";

export const Route = createFileRoute("/api/v1/openapi/json")({
  server: {
    handlers: {
      OPTIONS: () => corsPreflight(),
      GET: withPublic(async ({ url }) => {
        const doc = buildOpenApiDocument(url.origin);
        return new Response(JSON.stringify(doc, null, 2), {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=300",
          },
        });
      }),
    },
  },
});
