/**
 * Stripe webhook receiver — BlogAI Pro.
 *
 * URL de produção (cadastrar no Stripe Dashboard):
 *   https://blogai-pro.lovable.app/api/public/webhooks/stripe
 * URL do domínio customizado:
 *   https://monzart.com.br/api/public/webhooks/stripe
 *
 * Valida a assinatura HMAC com STRIPE_WEBHOOK_SECRET e atualiza o plano do
 * usuário automaticamente. Eventos processados:
 *   - checkout.session.completed
 *   - payment_intent.succeeded
 *   - payment_intent.payment_failed
 *   - customer.subscription.created
 *   - customer.subscription.updated
 *   - customer.subscription.deleted
 *   - invoice.payment_succeeded  (alias: invoice.paid)
 *   - invoice.payment_failed
 */
import { createFileRoute } from "@tanstack/react-router";
import type Stripe from "stripe";

const MAX_BODY_BYTES = 1_048_576; // 1 MB

async function logEvent(
  event: string,
  level: "info" | "warn" | "error",
  payload: Record<string, unknown>,
  userId?: string | null,
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("financial_logs").insert({
    event,
    level,
    payload: payload as never,
    user_id: userId ?? null,
  });
}

async function activatePayment(paymentId: string, externalId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.rpc("activate_payment", {
    p_payment_id: paymentId,
    p_external_id: externalId,
  });
}

/** Localiza o usuário via subscription/customer id salvos no banco. */
async function findUserByStripe(opts: {
  subscriptionId?: string | null;
  customerId?: string | null;
}): Promise<{ userId: string; planId: string | null } | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  if (opts.subscriptionId) {
    const { data } = await supabaseAdmin
      .from("subscriptions")
      .select("user_id, plan_id")
      .eq("stripe_subscription_id", opts.subscriptionId)
      .maybeSingle();
    if (data) return { userId: data.user_id, planId: data.plan_id };
  }
  if (opts.customerId) {
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("stripe_customer_id", opts.customerId)
      .maybeSingle();
    if (data) return { userId: data.id, planId: null };
  }
  return null;
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

  if (customerId) {
    await supabaseAdmin
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", userId);
  }

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

async function handlePaymentIntentSucceeded(pi: Stripe.PaymentIntent) {
  const userId = (pi.metadata?.user_id as string) || null;
  const planId = (pi.metadata?.plan_id as string) || null;
  if (!userId || !planId) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: existing } = await supabaseAdmin
    .from("payments")
    .select("id, status")
    .eq("external_id", pi.id)
    .maybeSingle();
  if (existing?.status === "paid") return;

  let paymentId = existing?.id ?? null;
  if (!paymentId) {
    const { data: inserted } = await supabaseAdmin
      .from("payments")
      .insert({
        user_id: userId,
        plan_id: planId,
        amount_cents: pi.amount_received ?? pi.amount ?? 0,
        currency: (pi.currency ?? "usd").toUpperCase(),
        method: "stripe",
        status: "pending",
        external_id: pi.id,
        metadata: {
          provider: "stripe",
          stripe_payment_intent_id: pi.id,
        },
      })
      .select("id")
      .single();
    paymentId = inserted?.id ?? null;
  }
  if (paymentId) await activatePayment(paymentId, pi.id);
}

async function handlePaymentIntentFailed(pi: Stripe.PaymentIntent) {
  const userId = (pi.metadata?.user_id as string) || null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin
    .from("payments")
    .update({
      status: "failed",
      metadata: {
        provider: "stripe",
        stripe_payment_intent_id: pi.id,
        last_error: pi.last_payment_error?.message ?? null,
      },
    })
    .eq("external_id", pi.id);
  await logEvent(
    "stripe.payment_intent.payment_failed",
    "warn",
    { id: pi.id, error: pi.last_payment_error?.message ?? null },
    userId,
  );
}

async function upsertSubscriptionFromStripe(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const found = await findUserByStripe({ subscriptionId: sub.id, customerId });
  if (!found) return;
  const planId = (sub.metadata?.plan_id as string) || found.planId;
  if (!planId) return;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const isActive = sub.status === "active" || sub.status === "trialing";
  const periodEnd = (sub as unknown as { current_period_end?: number }).current_period_end;

  await supabaseAdmin
    .from("subscriptions")
    .upsert(
      {
        user_id: found.userId,
        plan_id: planId,
        status: isActive ? "active" : sub.status,
        stripe_subscription_id: sub.id,
        current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      },
      { onConflict: "user_id" },
    );
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const found = await findUserByStripe({ subscriptionId: sub.id, customerId });
  if (!found) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin
    .from("subscriptions")
    .update({ status: "canceled", plan_id: "free" })
    .eq("user_id", found.userId);
  // Rebaixa perfil para plano gratuito (créditos padrão de boas-vindas).
  await supabaseAdmin
    .from("profiles")
    .update({ plan: "free", credits: 10 })
    .eq("id", found.userId);
  await logEvent("stripe.subscription.deleted", "info", { id: sub.id }, found.userId);
}

async function handleInvoiceSucceeded(invoice: Stripe.Invoice) {
  const rawSub = (invoice as unknown as { subscription?: string | { id: string } | null })
    .subscription;
  const subscriptionId = typeof rawSub === "string" ? rawSub : rawSub?.id ?? null;
  if (!subscriptionId) return;
  const customerId =
    typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? null;

  const found = await findUserByStripe({ subscriptionId, customerId });
  if (!found) return;
  const planId = (invoice.lines.data[0]?.metadata?.plan_id as string) || found.planId;
  if (!planId) return;

  const externalId = invoice.id ?? `${subscriptionId}:${invoice.period_end}`;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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
        user_id: found.userId,
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

async function handleInvoiceFailed(invoice: Stripe.Invoice) {
  const rawSub = (invoice as unknown as { subscription?: string | { id: string } | null })
    .subscription;
  const subscriptionId = typeof rawSub === "string" ? rawSub : rawSub?.id ?? null;
  const customerId =
    typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? null;
  const found = await findUserByStripe({ subscriptionId, customerId });
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  if (found) {
    await supabaseAdmin
      .from("subscriptions")
      .update({ status: "past_due" })
      .eq("user_id", found.userId);
  }
  await logEvent(
    "stripe.invoice.payment_failed",
    "warn",
    { invoice_id: invoice.id, subscription_id: subscriptionId },
    found?.userId ?? null,
  );
}

export const Route = createFileRoute("/api/public/webhooks/stripe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const signature = request.headers.get("stripe-signature");
        if (!signature) return new Response("missing signature", { status: 400 });

        const raw = await request.text();
        if (raw.length > MAX_BODY_BYTES) return new Response("payload too large", { status: 413 });

        let event: Stripe.Event;
        try {
          const { constructStripeEvent } = await import("@/lib/stripe.server");
          event = await constructStripeEvent(raw, signature);
        } catch (err) {
          console.error("[stripe-webhook] invalid signature", err);
          return new Response("invalid signature", { status: 401 });
        }

        await logEvent(`stripe.${event.type}`, "info", { id: event.id, type: event.type });

        try {
          switch (event.type) {
            case "checkout.session.completed":
            case "checkout.session.async_payment_succeeded":
              await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
              break;
            case "payment_intent.succeeded":
              await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
              break;
            case "payment_intent.payment_failed":
              await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
              break;
            case "customer.subscription.created":
            case "customer.subscription.updated":
              await upsertSubscriptionFromStripe(event.data.object as Stripe.Subscription);
              break;
            case "customer.subscription.deleted":
              await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
              break;
            case "invoice.payment_succeeded":
            case "invoice.paid":
              await handleInvoiceSucceeded(event.data.object as Stripe.Invoice);
              break;
            case "invoice.payment_failed":
              await handleInvoiceFailed(event.data.object as Stripe.Invoice);
              break;
            default:
              // Ack outros eventos para o Stripe parar de tentar novamente.
              break;
          }
        } catch (err) {
          console.error("[stripe-webhook] handler error", err);
          await logEvent("stripe.handler_error", "error", {
            id: event.id,
            type: event.type,
            error: err instanceof Error ? err.message : String(err),
          });
          return new Response("handler error", { status: 500 });
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
