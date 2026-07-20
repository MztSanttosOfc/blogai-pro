// GET /api/v1/feedback — lista feedback do usuário autenticado.
// POST /api/v1/feedback — cria novo feedback.
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { corsPreflight, jsonOk } from "@/lib/api/v1/envelope";
import { ApiError } from "@/lib/api/v1/errors";
import { withAuth } from "@/lib/api/v1/_middleware";
import { createFeedback, listMyFeedback } from "@/lib/feedback.server";

const CreateSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional().nullable(),
  suggestion: z.string().trim().max(2000).optional().nullable(),
  issue: z.string().trim().max(2000).optional().nullable(),
});

export const Route = createFileRoute("/api/v1/feedback/")({
  server: {
    handlers: {
      OPTIONS: () => corsPreflight(),
      GET: withAuth(async ({ requestId, ctx }) => {
        const rows = await listMyFeedback(ctx.supabase, ctx.userId);
        return jsonOk(rows, { requestId });
      }),
      POST: withAuth(async ({ request, requestId, ctx }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          throw new ApiError("bad_request", "Body inválido.", 400);
        }
        const parsed = CreateSchema.safeParse(body);
        if (!parsed.success) {
          throw new ApiError("validation_error", "Dados inválidos.", 422, parsed.error.issues.map((i) => ({
            field: i.path.join("."),
            message: i.message,
          })));
        }
        const row = await createFeedback(ctx.supabase, ctx.userId, parsed.data);
        return jsonOk(row, { requestId, status: 201 });
      }),
    },
  },
});
