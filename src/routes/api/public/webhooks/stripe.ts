/**
 * Stripe webhook receiver. Verifies signature with STRIPE_WEBHOOK_SECRET
 * and activates plans on successful payments/invoices.
 *
 * URL (production): https://blogai-pro.lovable.app/api/public/webhooks/stripe
 */
import { createFileRoute } from "@tanstack/react-router";
import type Stripe from "stripe";

const MAX_BODY_BYTES = 1_048_576; // 1 MB

async function activatePayment(paymentId: string, externalId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.rpc("activate_payment", {
    p_payment_id: paymentId,
    p_external_id: externalId,
  });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const userId = (session.metadata?.user_id as string) || session.client_reference_id || null;
  const planId = (session.metadata?.plan_id as string) || null;
  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id ?? null;

  if (!userId || !planId) return;

  // Persist Stripe customer id on profile for future reuse.
  if (customerId) {
    await supabaseAdmin
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", userId);
  }

  // Upsert a payment row keyed by session.id (external_id).
  const amountCents = session.amount_total ?? 0;
  const { data: existing } = await supabaseAdmin
    .from("payments")
    .select("id, status")
    .eq("external_id", session.id)
    .maybeSingle();

  let paymentId: string | null = existing?.id ?? null;

  if (!paymentId) {
    const { data: inserted } = await supabaseAdmin
      .from("payments")
      .insert({
        user_id: userId,
        plan_id: planId,
        amount_cents: amountCents,
        currency: "USD",
        method: "stripe",
        status: "pending",
        external_id: session.id,
        metadata: {
          provider: "stripe",
          stripe_session_id: session.id,
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: customerId,
          mode: session.mode,
        },
      })
      .select("id")
      .single();
    paymentId = inserted?.id ?? null;
  }

  if (paymentId && existing?.status !== "paid" && session.payment_status === "paid") {
    await activatePayment(paymentId, session.id);
    if (subscriptionId) {
      await supabaseAdmin
        .from("subscriptions")
        .update({ stripe_subscription_id: subscriptionId })
        .eq("user_id", userId);
    }
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  // Recurring renewals: create a fresh payment row per invoice and reactivate.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // Stripe SDK types vary across versions; the `subscription` field on
  // Invoice is present at runtime for subscription invoices.
  const rawSub = (invoice as unknown as { subscription?: string | { id: string } | null })
    .subscription;
  const subscriptionId =
    typeof rawSub === "string" ? rawSub : rawSub?.id ?? null;
  if (!subscriptionId) return;

  const customerId =
    typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? null;

  // Locate the user via subscription id or customer id.
  let userId: string | null = null;
  let planId: string | null = null;

  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("user_id, plan_id")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();
  if (sub) {
    userId = sub.user_id;
    planId = sub.plan_id;
  } else if (customerId) {
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    userId = prof?.id ?? null;
    planId = (invoice.lines.data[0]?.metadata?.plan_id as string) || null;
  }

  if (!userId || !planId) return;

  const externalId = invoice.id ?? `${subscriptionId}:${invoice.period_end}`;
  const { data: existing } = await supabaseAdmin
    .from("payments")
    .select("id, status")
    .eq("external_id", externalId)
    .maybeSingle();
  if (existing?.status === "paid") return;

  let paymentId = existing?.id ?? null;
  if (!paymentId) {
    const { data: inserted } = await supabaseAdmin
      .from("payments")
      .insert({
        user_id: userId,
        plan_id: planId,
        amount_cents: invoice.amount_paid ?? 0,
        currency: "USD",
        method: "stripe",
        status: "pending",
        external_id: externalId,
        metadata: {
          provider: "stripe",
          stripe_invoice_id: invoice.id,
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: customerId,
        },
      })
      .select("id")
      .single();
    paymentId = inserted?.id ?? null;
  }
  if (paymentId) await activatePayment(paymentId, externalId);
}

export const Route = createFileRoute("/api/public/webhooks/stripe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const signature = request.headers.get("stripe-signature");
        if (!signature) return new Response("missing signature", { status: 400 });

        const raw = await request.text();
        if (raw.length > MAX_BODY_BYTES) return new Response("payload too large", { status: 413 });

        let event;
        try {
          const { constructStripeEvent } = await import("@/lib/stripe.server");
          event = await constructStripeEvent(raw, signature);
        } catch (err) {
          console.error("[stripe-webhook] invalid signature", err);
          return new Response("invalid signature", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.from("financial_logs").insert({
          event: `stripe.${event.type}`,
          level: "info",
          payload: { id: event.id, type: event.type },
        });

        try {
          switch (event.type) {
            case "checkout.session.completed":
            case "checkout.session.async_payment_succeeded":
              await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
              break;
            case "invoice.paid":
            case "invoice.payment_succeeded":
              await handleInvoicePaid(event.data.object as Stripe.Invoice);
              break;
            default:
              // Ignore unhandled events but ack them so Stripe stops retrying.
              break;
          }
        } catch (err) {
          console.error("[stripe-webhook] handler error", err);
          await supabaseAdmin.from("financial_logs").insert({
            event: "stripe.handler_error",
            level: "error",
            payload: {
              id: event.id,
              type: event.type,
              error: err instanceof Error ? err.message : String(err),
            },
          });
          return new Response("handler error", { status: 500 });
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
