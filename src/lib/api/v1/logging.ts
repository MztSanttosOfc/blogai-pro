// BlogAI Pro — API Oficial v1: logging centralizado de requisições.
// Escreve em `api_request_logs` de forma "fire-and-forget" para não
// impactar a latência do endpoint.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export interface RequestLogEntry {
  requestId: string;
  userId: string | null;
  apiKeyId: string | null;
  authType: "jwt" | "api_key" | "public";
  method: string;
  path: string;
  statusCode: number;
  errorCode?: string | null;
  durationMs: number;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export function logRequest(admin: SupabaseClient<Database>, entry: RequestLogEntry): void {
  // Não aguardamos: qualquer falha no log não deve quebrar a resposta.
  void admin
    .from("api_request_logs")
    .insert({
      request_id: entry.requestId,
      user_id: entry.userId,
      api_key_id: entry.apiKeyId,
      auth_type: entry.authType,
      method: entry.method,
      path: entry.path,
      status_code: entry.statusCode,
      error_code: entry.errorCode ?? null,
      duration_ms: entry.durationMs,
      ip_address: entry.ipAddress ?? null,
      user_agent: entry.userAgent ?? null,
    })
    .then(({ error }) => {
      if (error) console.error("[api:v1:log] insert failed", error.message);
    });
}

export function extractIp(request: Request): string | null {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null
  );
}
