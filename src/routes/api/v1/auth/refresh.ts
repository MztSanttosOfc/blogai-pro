// POST /api/v1/auth/refresh — renova access_token via refresh_token.
// Reutiliza supabase.auth.refreshSession — mesma infraestrutura do app web.
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

import { corsPreflight, jsonOk, newRequestId, toErrorResponse } from "@/lib/api/v1/envelope";
import { ApiError } from "@/lib/api/v1/errors";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/api/v1/auth/refresh")({
  server: {
    handlers: {
      OPTIONS: () => corsPreflight(),
      POST: async ({ request }) => {
        const requestId = newRequestId();
        try {
          let body: { refresh_token?: unknown };
          try {
            body = (await request.json()) as typeof body;
          } catch {
            throw new ApiError("invalid_body", "Corpo JSON inválido.", 400);
          }
          const refreshToken =
            typeof body.refresh_token === "string" ? body.refresh_token.trim() : "";
          if (!refreshToken) {
            throw new ApiError("validation_error", "refresh_token é obrigatório.", 422, [
              { field: "refresh_token", message: "obrigatório" },
            ]);
          }

          const SUPABASE_URL = process.env.SUPABASE_URL;
          const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
          if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
            throw new ApiError("internal_error", "Configuração ausente.", 500);
          }

          const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
            auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
          });

          const { data, error } = await supabase.auth.refreshSession({
            refresh_token: refreshToken,
          });
          if (error || !data.session) {
            throw new ApiError("invalid_token", "Refresh token inválido ou expirado.", 401);
          }

          return jsonOk(
            {
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
              token_type: "Bearer",
              expires_in: data.session.expires_in,
              expires_at: data.session.expires_at,
            },
            { requestId },
          );
        } catch (err) {
          return toErrorResponse(err, requestId);
        }
      },
    },
  },
});
