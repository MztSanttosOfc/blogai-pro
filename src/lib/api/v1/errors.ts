// BlogAI Pro — API Oficial v1: erros padronizados.
// Uma classe única, mapeada pelo envelope para o shape de erro descrito em
// docs/api/ARCHITECTURE.md §6.3 / §7.1.

export type ApiErrorCode =
  | "unauthorized"
  | "invalid_token"
  | "forbidden"
  | "not_admin"
  | "not_premium"
  | "validation_error"
  | "invalid_body"
  | "missing_field"
  | "not_found"
  | "conflict"
  | "already_exists"
  | "insufficient_credits"
  | "plan_required"
  | "blogger_not_connected"
  | "blogger_unauthorized"
  | "blogger_publish_failed"
  | "gsc_not_connected"
  | "gsc_permission_denied"
  | "gsc_no_data"
  | "ai_unavailable"
  | "ai_quota_exceeded"
  | "ai_rate_limited"
  | "ai_content_empty"
  | "payment_failed"
  | "payment_provider_error"
  | "upstream_error"
  | "method_not_allowed"
  | "internal_error";

export interface ApiErrorDetail {
  field?: string;
  message: string;
}

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details?: ApiErrorDetail[];

  constructor(
    code: ApiErrorCode,
    message: string,
    status = 400,
    details?: ApiErrorDetail[],
  ) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export const DEFAULT_STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  unauthorized: 401,
  invalid_token: 401,
  forbidden: 403,
  not_admin: 403,
  not_premium: 403,
  validation_error: 422,
  invalid_body: 400,
  missing_field: 400,
  not_found: 404,
  conflict: 409,
  already_exists: 409,
  insufficient_credits: 402,
  plan_required: 403,
  blogger_not_connected: 409,
  blogger_unauthorized: 401,
  blogger_publish_failed: 502,
  gsc_not_connected: 409,
  gsc_permission_denied: 403,
  gsc_no_data: 200,
  ai_unavailable: 503,
  ai_quota_exceeded: 429,
  ai_rate_limited: 429,
  ai_content_empty: 502,
  payment_failed: 402,
  payment_provider_error: 502,
  upstream_error: 502,
  method_not_allowed: 405,
  internal_error: 500,
};
