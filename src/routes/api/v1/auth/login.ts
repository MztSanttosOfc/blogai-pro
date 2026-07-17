// POST /api/v1/auth/login — troca e-mail/senha por access_token + refresh_token.
// Reutiliza o Supabase Auth existente (mesmo login do app). Não altera nada
// no fluxo web atual — apenas expõe o mesmo mecanismo via REST para o
// Plugin Oficial do WordPress, SDKs e integrações externas.
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

import { corsPreflight, jsonOk, newRequestId, toErrorResponse } from "@/lib/api/v1/envelope";
import { ApiError } from "@/lib/api/v1/errors";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/api/v1/auth/login")({
  server: {
    handlers: {
      OPTIONS: () => corsPreflight(),
      POST: async ({ request }) => {
        const requestId = newRequestId();
        try {
          let body: { email?: unknown; password?: unknown };
          try {
            body = (await request.json()) as typeof body;
          } catch {
            throw new ApiError("invalid_body", "Corpo JSON inválido.", 400);
          }
          const email = typeof body.email === "string" ? body.email.trim() : "";
          const password = typeof body.password === "string" ? body.password : "";
          if (!email || !password) {
            throw new ApiError(
              "validation_error",
              "Informe email e senha.",
              422,
              [
                ...(!email ? [{ field: "email", message: "obrigatório" }] : []),
                ...(!password ? [{ field: "password", message: "obrigatório" }] : []),
              ],
            );
          }

          const SUPABASE_URL = process.env.SUPABASE_URL;
          const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
          if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
            throw new ApiError("internal_error", "Configuração ausente.", 500);
          }

          const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
            auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
          });

          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (error || !data.session) {
            throw new ApiError("unauthorized", "E-mail ou senha inválidos.", 401);
          }

          return jsonOk(
            {
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
              token_type: "Bearer",
              expires_in: data.session.expires_in,
              expires_at: data.session.expires_at,
              user: {
                id: data.user?.id,
                email: data.user?.email,
              },
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
