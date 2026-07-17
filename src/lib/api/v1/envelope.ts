// BlogAI Pro — API Oficial v1: envelope de resposta.
// Padroniza todos os retornos JSON conforme docs/api/ARCHITECTURE.md §6.

import { ApiError, DEFAULT_STATUS_BY_CODE, type ApiErrorCode, type ApiErrorDetail } from "./errors";

export const API_VERSION = "v1" as const;

export interface Pagination {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

interface Meta {
  request_id: string;
  api_version: typeof API_VERSION;
  pagination?: Pagination;
}

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Requested-With, Accept, Origin, Idempotency-Key",
  "Access-Control-Max-Age": "86400",
};

function newRequestId(): string {
  // Pequeno ULID-like sem dependência — suficiente para correlação em logs.
  const rand = Math.random().toString(36).slice(2, 10);
  const time = Date.now().toString(36);
  return `req_${time}${rand}`;
}

function baseHeaders(requestId: string): Record<string, string> {
  return {
    ...CORS_HEADERS,
    "Content-Type": "application/json; charset=utf-8",
    "X-Request-Id": requestId,
    "X-API-Version": API_VERSION,
  };
}

export interface JsonOkOptions {
  status?: number;
  pagination?: Pagination;
  requestId?: string;
  extraHeaders?: Record<string, string>;
}

export function jsonOk<T>(data: T, opts: JsonOkOptions = {}): Response {
  const requestId = opts.requestId ?? newRequestId();
  const meta: Meta = { request_id: requestId, api_version: API_VERSION };
  if (opts.pagination) meta.pagination = opts.pagination;

  const body = JSON.stringify({ success: true, data, meta });
  return new Response(body, {
    status: opts.status ?? 200,
    headers: { ...baseHeaders(requestId), ...(opts.extraHeaders ?? {}) },
  });
}

export function jsonError(
  code: ApiErrorCode,
  message: string,
  opts: { status?: number; details?: ApiErrorDetail[]; requestId?: string } = {},
): Response {
  const requestId = opts.requestId ?? newRequestId();
  const status = opts.status ?? DEFAULT_STATUS_BY_CODE[code] ?? 500;
  const body = JSON.stringify({
    success: false,
    error: {
      code,
      message,
      ...(opts.details ? { details: opts.details } : {}),
    },
    meta: { request_id: requestId, api_version: API_VERSION },
  });
  return new Response(body, { status, headers: baseHeaders(requestId) });
}

export function corsPreflight(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * Converte qualquer exceção em uma resposta padronizada.
 * - ApiError → shape completo com code/status/details.
 * - Error genérico → internal_error 500 (mensagem sanitizada).
 */
export function toErrorResponse(err: unknown, requestId?: string): Response {
  if (err instanceof ApiError) {
    return jsonError(err.code, err.message, {
      status: err.status,
      details: err.details,
      requestId,
    });
  }
  const message = err instanceof Error ? err.message : "Erro interno inesperado.";
  // Nunca vaza stack trace ao cliente. O log no servidor mantém o detalhe.
  console.error("[api:v1] unhandled", err);
  return jsonError("internal_error", "Erro interno. Tente novamente em instantes.", {
    status: 500,
    requestId,
    details: message ? [{ message }] : undefined,
  });
}

export { newRequestId };
