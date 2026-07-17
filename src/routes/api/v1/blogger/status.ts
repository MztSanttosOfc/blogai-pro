// GET /api/v1/blogger/status — estado da conexão do usuário com o Blogger.
// Reutiliza os helpers em src/lib/blogger.server.ts.
import { createFileRoute } from "@tanstack/react-router";

import { corsPreflight, jsonOk } from "@/lib/api/v1/envelope";
import { withAuth } from "@/lib/api/v1/_middleware";

export const Route = createFileRoute("/api/v1/blogger/status")({
  server: {
    handlers: {
      OPTIONS: () => corsPreflight(),
      GET: withAuth(async ({ ctx, requestId }) => {
        const { data } = await ctx.supabase
          .from("blogger_connections")
          .select(
            "connected_at, google_email, selected_blog_id, selected_blog_name, selected_blog_url, updated_at",
          )
          .maybeSingle();
        return jsonOk(
          {
            connected: !!data,
            google_email: data?.google_email ?? null,
            selected_blog_id: data?.selected_blog_id ?? null,
            selected_blog_name: data?.selected_blog_name ?? null,
            selected_blog_url: data?.selected_blog_url ?? null,
            connected_at: data?.connected_at ?? null,
            updated_at: data?.updated_at ?? null,
          },
          { requestId },
        );
      }),
    },
  },
});
