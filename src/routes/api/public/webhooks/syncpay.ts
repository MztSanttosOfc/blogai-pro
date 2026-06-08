import { createFileRoute } from "@tanstack/react-router";

/**
 * SyncPay webhook receiver.
 *
 * SyncPay does NOT provide a webhook signing secret, so the payload itself is
 * treated as UNTRUSTED. We only use it to learn which transaction changed, then
 * we independently re-query SyncPay's API for the real status before activating
 * any plan. This makes the endpoint safe to expose publicly.
 *
 * URL (production): https://blogai-pro.lovable.app/api/public/webhooks/syncpay
 */

// Best-effort, in-process rate limiter (per source IP). Worker instances are
// stateless across cold starts, so this is a mitigation, not a hard guarantee.
const RATE_LIMIT = 30; // requests
const RATE_WINDOW_MS = 60_000; // per minute
const MAX_BODY_BYTES = 16_384; // reject oversized payloads
const hits = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || entry.resetAt < now) {
    hits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT;
}

export const Route = createFileRoute("/api/public/webhooks/syncpay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ip =
          request.headers.get("cf-connecting-ip") ||
          request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
          "unknown";
        if (isRateLimited(ip)) {
          return new Response("rate limited", { status: 429 });
        }

        let identifier: string | null = null;
        try {
          const raw = await request.text();
          if (raw.length > MAX_BODY_BYTES) {
            return new Response("payload too large", { status: 413 });
          }
          const body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};

          // SyncPay payloads vary; accept the most common identifier fields.
          const data = (body.data as Record<string, unknown>) ?? body;
          identifier =
            (data.identifier as string) ||
            (data.reference_id as string) ||
            (data.id as string) ||
            (body.identifier as string) ||
            null;
        } catch {
          return new Response("invalid payload", { status: 400 });
        }

        if (!identifier) {
          return new Response("missing identifier", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { getTransaction } = await import("@/lib/syncpay.server");

        const { data: payment } = await supabaseAdmin
          .from("payments")
          .select("id, status, external_id")
          .eq("external_id", identifier)
          .maybeSingle();

        if (!payment) {
          // Unknown transaction — acknowledge so SyncPay stops retrying.
          await supabaseAdmin.from("financial_logs").insert({
            event: "webhook.unknown_transaction",
            level: "warn",
            payload: { identifier },
          });
          return new Response("ok");
        }

        if (payment.status === "paid") {
          return new Response("ok");
        }

        try {
          // Independent verification — never trust the webhook body.
          const tx = await getTransaction(identifier);

          if (tx.status === "completed") {
            const { error } = await supabaseAdmin.rpc("activate_payment", {
              p_payment_id: payment.id,
              p_external_id: identifier,
            });
            if (error) {
              await supabaseAdmin.from("financial_logs").insert({
                event: "webhook.activation_failed",
                level: "error",
                payload: { identifier, error: error.message },
              });
              return new Response("activation failed", { status: 500 });
            }
          } else if (tx.status === "failed" || tx.status === "refunded") {
            await supabaseAdmin
              .from("payments")
              .update({ status: "failed", updated_at: new Date().toISOString() })
              .eq("id", payment.id);
          }
        } catch (err) {
          await supabaseAdmin.from("financial_logs").insert({
            event: "webhook.verify_error",
            level: "error",
            payload: { identifier, error: err instanceof Error ? err.message : String(err) },
          });
          return new Response("verify error", { status: 500 });
        }

        return new Response("ok");
      },
    },
  },
});
