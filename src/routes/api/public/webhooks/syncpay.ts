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
export const Route = createFileRoute("/api/public/webhooks/syncpay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let identifier: string | null = null;
        try {
          const raw = await request.text();
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
