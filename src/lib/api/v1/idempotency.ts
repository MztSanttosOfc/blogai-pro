// BlogAI Pro — API Oficial v1: suporte a Idempotency-Key.
// Armazena a resposta de operações POST/PATCH/DELETE por 24h e retorna
// a mesma resposta em requisições subsequentes com a mesma chave.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { ApiError } from "./errors";
import { sha256Hex } from "./api-keys.server";

const MAX_KEY_LEN = 255;

export function readIdempotencyKey(request: Request): string | null {
  const raw =
    request.headers.get("idempotency-key") ??
    request.headers.get("Idempotency-Key");
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > MAX_KEY_LEN) return null;
  return trimmed;
}

export interface CachedIdempotentResponse {
  response_status: number;
  response_body: unknown;
}

/**
 * Retorna a resposta cacheada se a chave já foi usada. Se a mesma chave
 * tiver sido usada com corpo diferente, lança idempotency_conflict.
 */
export async function lookupIdempotency(
  admin: SupabaseClient<Database>,
  opts: {
    userId: string;
    key: string;
    method: string;
    path: string;
    requestBody: unknown;
  },
): Promise<CachedIdempotentResponse | null> {
  const request_hash = await sha256Hex(
    JSON.stringify(opts.requestBody ?? null) + "|" + opts.method + "|" + opts.path,
  );

  const { data, error } = await admin
    .from("api_idempotency_keys")
    .select("request_hash, response_status, response_body, expires_at")
    .eq("user_id", opts.userId)
    .eq("idempotency_key", opts.key)
    .eq("method", opts.method)
    .eq("path", opts.path)
    .maybeSingle();

  if (error || !data) return null;

  if (new Date(data.expires_at).getTime() < Date.now()) return null;

  if (data.request_hash !== request_hash) {
    throw new ApiError(
      "idempotency_conflict",
      "Idempotency-Key já usada com corpo diferente.",
      409,
    );
  }

  return {
    response_status: data.response_status,
    response_body: data.response_body,
  };
}

export async function saveIdempotency(
  admin: SupabaseClient<Database>,
  opts: {
    userId: string;
    key: string;
    method: string;
    path: string;
    requestBody: unknown;
    responseStatus: number;
    responseBody: unknown;
  },
): Promise<void> {
  const request_hash = await sha256Hex(
    JSON.stringify(opts.requestBody ?? null) + "|" + opts.method + "|" + opts.path,
  );
  await admin.from("api_idempotency_keys").insert({
    user_id: opts.userId,
    idempotency_key: opts.key,
    method: opts.method,
    path: opts.path,
    request_hash,
    response_status: opts.responseStatus,
    response_body: opts.responseBody as never,
  });
}
