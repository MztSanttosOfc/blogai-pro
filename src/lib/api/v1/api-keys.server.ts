// BlogAI Pro — API Oficial v1: geração e validação de API Keys.
// Server-only. Formato do token: `bap_<env>_<random32>` (ex.: bap_live_...).
// Persistido apenas o hash SHA-256 (hex). O token completo é revelado
// somente no momento da criação.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const TOKEN_PREFIX = "bap_live_";

function toHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

function randomToken(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return toHex(buf);
}

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toHex(new Uint8Array(digest));
}

export interface GeneratedApiKey {
  token: string; // apresentado uma única vez
  prefix: string; // 12 primeiros chars (para exibição posterior)
  key_hash: string; // sha256(token)
}

export async function generateApiKey(): Promise<GeneratedApiKey> {
  const token = TOKEN_PREFIX + randomToken(24);
  const key_hash = await sha256Hex(token);
  return { token, prefix: token.slice(0, 16), key_hash };
}

export interface ApiKeyRow {
  id: string;
  user_id: string;
  name: string;
  prefix: string;
  scopes: string[];
  rate_limit_per_minute: number;
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

/**
 * Verifica um token bruto (Bearer bap_live_...) contra a tabela `api_keys`
 * usando o client admin (bypass RLS). Retorna null se não encontrada.
 */
export async function verifyApiKey(
  admin: SupabaseClient<Database>,
  rawToken: string,
): Promise<ApiKeyRow | null> {
  if (!rawToken.startsWith("bap_")) return null;
  const key_hash = await sha256Hex(rawToken);

  const { data, error } = await admin
    .from("api_keys")
    .select(
      "id, user_id, name, prefix, scopes, rate_limit_per_minute, last_used_at, expires_at, revoked_at, created_at",
    )
    .eq("key_hash", key_hash)
    .maybeSingle();

  if (error || !data) return null;
  return data as ApiKeyRow;
}

export function isTokenLikeApiKey(token: string): boolean {
  return token.startsWith("bap_");
}
