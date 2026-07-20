import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequestUrl } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CreateCheckoutInput = z.object({
  planId: z.enum(["pro", "premium", "teste"]),
  recurring: z.boolean().optional(),
  successPath: z.string().optional(),
  cancelPath: z.string().optional(),
});

/**
 * Creates a Stripe Checkout Session (USD) and persists a pending payment row.
 * SyncPay continues to handle BRL — this fn is Stripe-only.
 */
export const createStripeCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateCheckoutInput.parse(input))
  .handler(async ({ data, context }) => {
    const { userId, claims } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createStripeCheckoutSession, isStripeConfigured } = await import(
      "@/lib/stripe.server"
    );

    if (!isStripeConfigured()) {
      throw new Error(
        "Pagamentos internacionais em USD ainda não estão disponíveis. Volte em breve.",
      );
    }

    const { data: plan } = await supabaseAdmin
      .from("plans")
      .select("id, name, price_cents, price_usd_cents, active")
      .eq("id", data.planId)
      .single();

    if (!plan || !plan.active || !plan.price_usd_cents || plan.price_usd_cents <= 0) {
      throw new Error("Plano indisponível em USD.");
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email, full_name, stripe_customer_id")
      .eq("id", userId)
      .single();

    const email = (profile?.email || (claims?.email as string) || "").trim();
    if (!email) throw new Error("E-mail do usuário não encontrado.");

    const origin = new URL(getRequestUrl()).origin;
    const successUrl = `${origin}${data.successPath ?? "/financeiro?stripe=success&session_id={CHECKOUT_SESSION_ID}"}`;
    const cancelUrl = `${origin}${data.cancelPath ?? "/pricing?stripe=cancel"}`;

    const isPaidPlan = data.planId === "pro" || data.planId === "premium";
    const recurring = data.recurring ?? isPaidPlan;

    const session = await createStripeCheckoutSession({
      userId,
      email,
      planId: plan.id,
      planName: plan.name,
      amountUsdCents: plan.price_usd_cents,
      successUrl,
      cancelUrl,
      recurring,
      customerId: profile?.stripe_customer_id ?? null,
    });

    if (!session.url) throw new Error("Stripe não retornou URL de checkout.");

    await supabaseAdmin.from("payments").insert({
      user_id: userId,
      plan_id: plan.id,
      amount_cents: plan.price_usd_cents,
      currency: "USD",
      method: "stripe",
      status: "pending",
      external_id: session.sessionId,
      metadata: {
        provider: "stripe",
        stripe_session_id: session.sessionId,
        stripe_customer_id: session.customerId,
        mode: recurring ? "subscription" : "payment",
      },
    });

    if (session.customerId && !profile?.stripe_customer_id) {
      await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: session.customerId })
        .eq("id", userId);
    }

    await supabaseAdmin.from("financial_logs").insert({
      event: "stripe.checkout.created",
      level: "info",
      user_id: userId,
      payload: { session_id: session.sessionId, plan_id: plan.id },
    });

    return { url: session.url, sessionId: session.sessionId };
  });

const VerifyInput = z.object({ sessionId: z.string().min(1) });

/** Manually reconciles a Stripe checkout session (fallback if webhook lags). */
export const verifyStripeCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => VerifyInput.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getStripeSession } = await import("@/lib/stripe.server");

    const { data: payment } = await supabaseAdmin
      .from("payments")
      .select("id, user_id, status, external_id")
      .eq("external_id", data.sessionId)
      .maybeSingle();
    if (!payment || payment.user_id !== userId) throw new Error("Pagamento não encontrado.");
    if (payment.status === "paid") return { status: "paid" as const };

    const session = await getStripeSession(data.sessionId);
    if (session.payment_status === "paid") {
      await supabaseAdmin.rpc("activate_payment", {
        p_payment_id: payment.id,
        p_external_id: data.sessionId,
      });
      return { status: "paid" as const };
    }
    if (session.status === "expired") return { status: "failed" as const };
    return { status: "pending" as const };
  });
