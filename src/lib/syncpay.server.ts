/**
 * Server-only SyncPay API client. NEVER import this from client code.
 * Credentials are read from environment secrets at call time.
 *
 * Docs: https://syncpay.apidog.io
 *  - Auth:        POST /api/partner/v1/auth-token       (client_id + client_secret -> Bearer, 1h)
 *  - Cash-in:     POST /api/partner/v1/cash-in          (creates a Pix charge)
 *  - Transaction: GET  /api/partner/v1/transaction/{id} (independent status check)
 */

const DEFAULT_BASE = "https://api.syncpayments.com.br";

function baseUrl(): string {
  return (process.env.SYNCPAY_API_BASE || DEFAULT_BASE).replace(/\/$/, "");
}

// Simple in-process token cache (token is valid ~1h).
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAuthToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.token;
  }

  const clientId = process.env.SYNCPAY_CLIENT_ID;
  const clientSecret = process.env.SYNCPAY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Credenciais da SyncPay não configuradas.");
  }

  const res = await fetch(`${baseUrl()}/api/partner/v1/auth-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[syncpay] auth failed", res.status, text.slice(0, 500));
    throw new Error(`Falha na autenticação SyncPay (${res.status}).`);
  }

  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) throw new Error("SyncPay não retornou token de acesso.");

  cachedToken = {
    token: json.access_token,
    expiresAt: now + (json.expires_in ?? 3600) * 1000,
  };
  return cachedToken.token;
}

export interface CashInClient {
  name: string;
  cpf: string;
  email: string;
  phone: string;
}

export interface CashInResult {
  message: string;
  pixCode: string;
  identifier: string;
}

/** Creates a Pix charge (Cash-In) and returns the copy-paste/QR code + identifier. */
export async function createCashIn(params: {
  amount: number; // in BRL (reais)
  description: string;
  webhookUrl: string;
  client: CashInClient;
}): Promise<CashInResult> {
  const token = await getAuthToken();

  const res = await fetch(`${baseUrl()}/api/partner/v1/cash-in`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      amount: Number(params.amount.toFixed(2)),
      description: params.description,
      webhook_url: params.webhookUrl,
      client: {
        name: params.client.name,
        cpf: params.client.cpf,
        email: params.client.email,
        phone: params.client.phone,
      },
    }),
    signal: AbortSignal.timeout(20000),
  });

  const json = (await res.json().catch(() => ({}))) as {
    message?: string;
    pix_code?: string;
    identifier?: string;
    errors?: Record<string, string[]>;
  };

  if (!res.ok || !json.pix_code || !json.identifier) {
    const detail =
      json.message ||
      (json.errors ? Object.values(json.errors).flat().join(" ") : "") ||
      `HTTP ${res.status}`;
    throw new Error(`Falha ao gerar o Pix: ${detail}`);
  }

  return {
    message: json.message ?? "",
    pixCode: json.pix_code,
    identifier: json.identifier,
  };
}

export type SyncPayStatus = "pending" | "completed" | "failed" | "refunded" | "med";

export interface TransactionStatus {
  identifier: string;
  status: SyncPayStatus | string;
  amount: number | null;
}

/** Independently queries the real status of a transaction by its identifier. */
export async function getTransaction(identifier: string): Promise<TransactionStatus> {
  const token = await getAuthToken();

  const res = await fetch(
    `${baseUrl()}/api/partner/v1/transaction/${encodeURIComponent(identifier)}`,
    {
      method: "GET",
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15000),
    },
  );

  if (!res.ok) {
    throw new Error(`Falha ao consultar transação SyncPay (${res.status}).`);
  }

  const json = (await res.json()) as {
    data?: { reference_id?: string; status?: string; amount?: number };
  };
  const data = json.data ?? {};
  return {
    identifier: data.reference_id ?? identifier,
    status: (data.status as SyncPayStatus) ?? "pending",
    amount: typeof data.amount === "number" ? data.amount : null,
  };
}
