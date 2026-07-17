// GET  /api/v1/scheduling — lista agendamentos do usuário.
// POST /api/v1/scheduling — cria um novo agendamento.
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { corsPreflight, jsonOk } from "@/lib/api/v1/envelope";
import { ApiError } from "@/lib/api/v1/errors";
import { withAuth } from "@/lib/api/v1/_middleware";
import { createScheduledPostFor, listScheduledPostsFor } from "@/lib/scheduling.server";

const CreateInput = z.object({
  article_id: z.string().uuid(),
  scheduled_at: z.string().datetime({ offset: true }),
});

export const Route = createFileRoute("/api/v1/scheduling/")({
  server: {
    handlers: {
      OPTIONS: () => corsPreflight(),
      GET: withAuth(async ({ ctx, requestId }) => {
        const items = await listScheduledPostsFor(ctx.supabase);
        return jsonOk(items, { requestId });
      }),
      POST: withAuth(async ({ ctx, request, requestId }) => {
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          throw new ApiError("invalid_body", "Corpo JSON inválido.", 400);
        }
        const parsed = CreateInput.safeParse(raw);
        if (!parsed.success) {
          throw new ApiError(
            "validation_error",
            "Dados inválidos.",
            422,
            parsed.error.issues.map((i) => ({
              field: i.path.join("."),
              message: i.message,
            })),
          );
        }
        const created = await createScheduledPostFor(ctx.supabase, ctx.userId, {
          articleId: parsed.data.article_id,
          scheduledAt: parsed.data.scheduled_at,
        });
        return jsonOk(created, { requestId, status: 201 });
      }),
    },
  },
});
