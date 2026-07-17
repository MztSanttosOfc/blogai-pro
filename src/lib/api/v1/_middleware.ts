// BlogAI Pro — API Oficial v1: middleware compartilhado (Fase 3).
// Suporta duas formas de autenticação Bearer:
//   1) JWT do Supabase (usuário logado no app)   → context.authType = "jwt"
//   2) API Key BlogAI Pro (bap_live_...)          → context.authType = "api_key"
// Também aplica: rate limiting, idempotência, logging centralizado.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { ApiError } from "./errors";
import {
  corsPreflight,
  jsonError,
  jsonOk,
  newRequestId,
  toErrorResponse,
} from "./envelope";
import {
  isTokenLikeApiKey,
  verifyApiKey,
  type ApiKeyRow,
} from "./api-keys.server";
import { checkRateLimit, rateLimitHeaders } from "./rate-limit";
import {
  extractIp,
  logRequest,
  type RequestLogEntry,
} from "./logging";
import {
  lookupIdempotency,
  readIdempotencyKey,
  saveIdempotency,
} from "./idempotency";

export type AuthType = "jwt" | "api_key";

export interface AuthContext {
  supabase: SupabaseClient<Database>;
  userId: string;
  token: string;
  claims: Record<string, unknown>;
  authType: AuthType;
  apiKey: ApiKeyRow | null;
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
  if (!value) throw new ApiError("internal_error", `Configuração ausente (${name}).`, 500);
  return value;
}

function userClient(token: string): SupabaseClient<Database> {
  const SUPABASE_URL = readEnv("SUPABASE_URL");
  const SUPABASE_PUBLISHABLE_KEY = readEnv("SUPABASE_PUBLISHABLE_KEY");
  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

async function adminClient(): Promise<SupabaseClient<Database>> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as SupabaseClient<Database>;
}

async function verifyBearer(request: Request): Promise<AuthContext> {
  const authHeader = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!authHeader) throw new ApiError("unauthorized", "Token não informado.", 401);
  if (!authHeader.startsWith("Bearer ")) {
    throw new ApiError("unauthorized", "Apenas tokens Bearer são aceitos.", 401);
  }
  const token = authHeader.slice(7).trim();
  if (!token) throw new ApiError("unauthorized", "Token vazio.", 401);

  // ---- API Key path (bap_live_...) ------------------------------------
  if (isTokenLikeApiKey(token)) {
    const admin = await adminClient();
    const row = await verifyApiKey(admin, token);
    if (!row) throw new ApiError("api_key_invalid", "API Key inválida.", 401);
    if (row.revoked_at) throw new ApiError("api_key_revoked", "API Key revogada.", 401);
    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
      throw new ApiError("api_key_expired", "API Key expirada.", 401);
    }

    // Atualiza last_used_at em background (não bloqueia).
    void admin
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", row.id);

    // Client Supabase impersonando o dono da API Key (RLS aplicada).
    // Gera um "session-less" client usando a service key mas filtrando
    // pelo user_id — para respeitar isolamento, usamos admin apenas para
    // handlers que já filtram por ctx.userId. Aqui devolvemos o admin
    // com o cuidado obrigatório de sempre filtrar por userId.
    return {
      supabase: admin,
      userId: row.user_id,
      token,
      claims: { sub: row.user_id, api_key_id: row.id },
      authType: "api_key",
      apiKey: row,
    };
  }

  // ---- JWT path -------------------------------------------------------
  const supabase = userClient(token);
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) {
    throw new ApiError("invalid_token", "Token inválido ou expirado.", 401);
  }

  return {
    supabase,
    userId: data.claims.sub as string,
    token,
    claims: data.claims as Record<string, unknown>,
    authType: "jwt",
    apiKey: null,
  };
}

function mergeHeaders(res: Response, extra: Record<string, string>): Response {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(extra)) headers.set(k, v);
  return new Response(res.body, { status: res.status, headers });
}

export function withAuth(handler: AuthedHandler) {
  return async ({ request }: { request: Request }): Promise<Response> => {
    if (request.method === "OPTIONS") return corsPreflight();
    const requestId = newRequestId();
    const started = Date.now();
    const url = new URL(request.url);

    let ctx: AuthContext | null = null;
    let response: Response;

    try {
      ctx = await verifyBearer(request);

      // Rate limit (aplicado apenas quando existir client admin disponível)
      const admin = await adminClient();
      const info = await checkRateLimit(admin, {
        userId: ctx.userId,
        apiKeyId: ctx.apiKey?.id ?? null,
        limitOverride: ctx.apiKey?.rate_limit_per_minute,
      });

      // Idempotency: apenas para métodos de escrita.
      const idKey = readIdempotencyKey(request);
      const isWrite = ["POST", "PATCH", "PUT", "DELETE"].includes(request.method);
      let requestBodyForIdem: unknown = null;

      if (idKey && isWrite) {
        try {
          const cloned = request.clone();
          const text = await cloned.text();
          requestBodyForIdem = text ? JSON.parse(text) : null;
        } catch {
          requestBodyForIdem = null;
        }

        const cached = await lookupIdempotency(admin, {
          userId: ctx.userId,
          key: idKey,
          method: request.method,
          path: url.pathname,
          requestBody: requestBodyForIdem,
        });
        if (cached) {
          response = new Response(JSON.stringify(cached.response_body), {
            status: cached.response_status,
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              "X-Request-Id": requestId,
              "X-Idempotent-Replayed": "true",
              ...rateLimitHeaders(info),
            },
          });
          logRequest(admin, buildLog(ctx, request, url, response.status, null, requestId, Date.now() - started));
          return response;
        }
      }

      response = await handler({ request, url, requestId, ctx });
      response = mergeHeaders(response, rateLimitHeaders(info));

      // Persistir idempotência ao final (best-effort para 2xx).
      if (idKey && isWrite && response.status >= 200 && response.status < 300) {
        try {
          const bodyText = await response.clone().text();
          const bodyJson = bodyText ? JSON.parse(bodyText) : null;
          await saveIdempotency(admin, {
            userId: ctx.userId,
            key: idKey,
            method: request.method,
            path: url.pathname,
            requestBody: requestBodyForIdem,
            responseStatus: response.status,
            responseBody: bodyJson,
          });
        } catch (e) {
          console.error("[api:v1] idempotency save failed", e);
        }
      }

      logRequest(admin, buildLog(ctx, request, url, response.status, null, requestId, Date.now() - started));
      return response;
    } catch (err) {
      response = toErrorResponse(err, requestId);
      if (ctx) {
        const admin = await adminClient();
        const code = err instanceof ApiError ? err.code : "internal_error";
        logRequest(admin, buildLog(ctx, request, url, response.status, code, requestId, Date.now() - started));
      }
      return response;
    }
  };
}

function buildLog(
  ctx: AuthContext,
  request: Request,
  url: URL,
  status: number,
  errorCode: string | null,
  requestId: string,
  durationMs: number,
): RequestLogEntry {
  return {
    requestId,
    userId: ctx.userId,
    apiKeyId: ctx.apiKey?.id ?? null,
    authType: ctx.authType,
    method: request.method,
    path: url.pathname,
    statusCode: status,
    errorCode,
    durationMs,
    ipAddress: extractIp(request),
    userAgent: request.headers.get("user-agent"),
  };
}

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
  return jsonError("method_not_allowed", "Método HTTP não suportado.", {
    status: 405,
    requestId,
  });
}

// Reexport for existing endpoints
export { jsonOk };
