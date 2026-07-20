/**
 * Server-only Stripe API client. NEVER import from client code.
 * Mirrors the architecture of syncpay.server.ts and is only used for
 * international (USD) payments. BRL keeps flowing through SyncPay.
 *
 * Reads credentials at call time from Secrets:
 *   - STRIPE_SECRET_KEY (required)
 *   - STRIPE_WEBHOOK_SECRET (required to verify webhook signatures)
 *
 * VITE_STRIPE_PUBLISHABLE_KEY is a browser-only publishable key and is not
 * consumed here; the checkout flow redirects to Stripe's hosted URL, so
 * Stripe.js is not required on the client.
 */
import Stripe from "stripe";

let cached: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "Stripe não configurado. Adicione STRIPE_SECRET_KEY nas Secrets do projeto.",
    );
  }
  cached = new Stripe(key, {
    apiVersion: "2024-11-20.acacia" as Stripe.LatestApiVersion,
    // Workers-compatible: Stripe SDK works with global fetch by default.
    // Web Crypto for signature verification uses `constructEventAsync`.
    httpClient: Stripe.createFetchHttpClient(),
  });
  return cached;
}

export interface StripeCheckoutParams {
  userId: string;
  email: string;
  planId: string;
  planName: string;
  amountUsdCents: number;
  successUrl: string;
  cancelUrl: string;
  /** true = mode 'subscription' (recurring), false = mode 'payment' (one-off). */
  recurring: boolean;
  /** Reuse existing Stripe customer if the user already has one. */
  customerId?: string | null;
}

export interface StripeCheckoutResult {
  sessionId: string;
  url: string;
  customerId: string | null;
}

/** Creates a Stripe Checkout Session (one-off or subscription). */
export async function createStripeCheckoutSession(
  params: StripeCheckoutParams,
): Promise<StripeCheckoutResult> {
  const stripe = getStripe();

  const productData: Stripe.Checkout.SessionCreateParams.LineItem.PriceData.ProductData = {
    name: `BlogAI Pro — Plano ${params.planName}`,
  };

  const priceData: Stripe.Checkout.SessionCreateParams.LineItem.PriceData = {
    currency: "usd",
    unit_amount: params.amountUsdCents,
    product_data: productData,
    ...(params.recurring ? { recurring: { interval: "month" } } : {}),
  };

  const session = await stripe.checkout.sessions.create({
    mode: params.recurring ? "subscription" : "payment",
    payment_method_types: ["card"],
    line_items: [{ price_data: priceData, quantity: 1 }],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    ...(params.customerId
      ? { customer: params.customerId }
      : { customer_email: params.email, customer_creation: params.recurring ? undefined : "always" }),
    client_reference_id: params.userId,
    metadata: {
      user_id: params.userId,
      plan_id: params.planId,
      currency: "USD",
      provider: "stripe",
    },
    ...(params.recurring
      ? {
          subscription_data: {
            metadata: {
              user_id: params.userId,
              plan_id: params.planId,
            },
          },
        }
      : {
          payment_intent_data: {
            metadata: {
              user_id: params.userId,
              plan_id: params.planId,
            },
          },
        }),
  });

  return {
    sessionId: session.id,
    url: session.url ?? "",
    customerId: (typeof session.customer === "string" ? session.customer : session.customer?.id) ?? null,
  };
}

/** Verifies a Stripe webhook signature and returns the parsed event. */
export async function constructStripeEvent(
  rawBody: string,
  signature: string,
): Promise<Stripe.Event> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET não configurado.");
  }
  const stripe = getStripe();
  // Async variant uses Web Crypto (Workers-compatible).
  return stripe.webhooks.constructEventAsync(rawBody, signature, secret);
}

/** Retrieves an expanded Checkout Session (used for manual verification). */
export async function getStripeSession(sessionId: string): Promise<Stripe.Checkout.Session> {
  return getStripe().checkout.sessions.retrieve(sessionId, {
    expand: ["subscription", "payment_intent"],
  });
}
