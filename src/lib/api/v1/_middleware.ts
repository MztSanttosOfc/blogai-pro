// BlogAI Pro — API Oficial v1: middleware compartilhado para rotas REST.
// Reutiliza a mesma lógica de autenticação de requireSupabaseAuth, adaptada
// para o contexto de server routes (raw Request/Response).

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { ApiError } from "./errors";
import { corsPreflight, jsonError, newRequestId, toErrorResponse } from "./envelope";

export interface AuthContext {
  supabase: SupabaseClient<Database>;
  userId: string;
  token: string;
  claims: Record<string, unknown>;
}

export interface HandlerContext {
  request: Request;
  url: URL;
  requestId: string;
}

export interface AuthedHandlerContext extends HandlerContext {
  ctx: AuthContext;
}

export type PublicHandler = (ctx: HandlerContext) => Promise<Response> | Response;
export type AuthedHandler = (ctx: AuthedHandlerContext) => Promise<Response> | Response;

function readEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new ApiError(
      "internal_error",
      `Configuração ausente no servidor (${name}).`,
      500,
    );
  }
  return value;
}

async function verifyBearer(request: Request): Promise<AuthContext> {
  const authHeader = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!authHeader) {
    throw new ApiError("unauthorized", "Token de autenticação não informado.", 401);
  }
  if (!authHeader.startsWith("Bearer ")) {
    throw new ApiError("unauthorized", "Apenas tokens Bearer são aceitos.", 401);
  }
  const token = authHeader.slice(7).trim();
  if (!token) {
    throw new ApiError("unauthorized", "Token vazio.", 401);
  }

  const SUPABASE_URL = readEnv("SUPABASE_URL");
  const SUPABASE_PUBLISHABLE_KEY = readEnv("SUPABASE_PUBLISHABLE_KEY");

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) {
    throw new ApiError("invalid_token", "Token inválido ou expirado.", 401);
  }

  return {
    supabase,
    userId: data.claims.sub as string,
    token,
    claims: data.claims as Record<string, unknown>,
  };
}

/**
 * Wrapper para rotas autenticadas. Também trata CORS/OPTIONS e mapeia erros
 * para o envelope padrão.
 */
export function withAuth(handler: AuthedHandler) {
  return async ({ request }: { request: Request }): Promise<Response> => {
    if (request.method === "OPTIONS") return corsPreflight();
    const requestId = newRequestId();
    try {
      const ctx = await verifyBearer(request);
      const url = new URL(request.url);
      return await handler({ request, url, requestId, ctx });
    } catch (err) {
      return toErrorResponse(err, requestId);
    }
  };
}

/**
 * Wrapper para rotas públicas (ex.: /plans, /openapi.json).
 */
export function withPublic(handler: PublicHandler) {
  return async ({ request }: { request: Request }): Promise<Response> => {
    if (request.method === "OPTIONS") return corsPreflight();
    const requestId = newRequestId();
    try {
      const url = new URL(request.url);
      return await handler({ request, url, requestId });
    } catch (err) {
      return toErrorResponse(err, requestId);
    }
  };
}

/**
 * Cria um client Supabase server-side com a chave publishable (sem sessão).
 * Uso restrito a leituras públicas cobertas por policies TO anon.
 */
export function createServerPublishableClient(): SupabaseClient<Database> {
  const SUPABASE_URL = readEnv("SUPABASE_URL");
  const key = readEnv("SUPABASE_PUBLISHABLE_KEY");
  return createClient<Database>(SUPABASE_URL, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export function methodNotAllowed(requestId: string): Response {
  return jsonError("method_not_allowed", "Método HTTP não suportado neste endpoint.", {
    status: 405,
    requestId,
  });
}
