/**
 * POST /api/v1/payments/checkout
 * Cria uma sessão de checkout usando o gateway apropriado:
 *   • currency=BRL → SyncPay (retorna dados Pix)
 *   • currency=USD → Stripe (retorna URL do Checkout)
 *
 * Endpoint autenticado (JWT ou API Key). Usado pelo Plugin Oficial do
 * WordPress, pelo app Android (Capacitor) e por integrações externas.
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { corsPreflight, jsonOk } from "@/lib/api/v1/envelope";
import { ApiError } from "@/lib/api/v1/errors";
import { withAuth } from "@/lib/api/v1/_middleware";

const Body = z.object({
  plan_id: z.enum(["pro", "premium", "teste"]),
  currency: z.enum(["BRL", "USD"]),
  recurring: z.boolean().optional(),
  success_url: z.string().url().optional(),
  cancel_url: z.string().url().optional(),
  // BRL only:
  cpf: z.string().regex(/^\d{11}$/).optional(),
  phone: z.string().regex(/^\d{10,11}$/).optional(),
});

export const Route = createFileRoute("/api/v1/payments/checkout")({
  server: {
    handlers: {
      OPTIONS: () => corsPreflight(),
      POST: withAuth(async ({ request, ctx, requestId }) => {
        const raw = await request.json().catch(() => ({}));
        const parsed = Body.safeParse(raw);
        if (!parsed.success) {
          throw new ApiError("validation_error", "Payload inválido", 422, {
            details: parsed.error.issues.map((i) => ({
              field: i.path.join("."),
              message: i.message,
            })),
          });
        }
        const input = parsed.data;
        const { supabase, userId } = ctx;

        if (input.currency === "USD") {
          const { data: plan } = await supabase
            .from("plans")
            .select("id, name, price_cents, price_usd_cents, active")
            .eq("id", input.plan_id)
            .single();
          if (!plan || !plan.active || !plan.price_usd_cents) {
            throw new ApiError("plan_unavailable", "Plano indisponível em USD.", 422);
          }
          const { createStripeCheckoutSession, isStripeConfigured } = await import(
            "@/lib/stripe.server"
          );
          if (!isStripeConfigured()) {
            throw new ApiError(
              "gateway_unavailable",
              "Stripe ainda não configurado no servidor.",
              503,
            );
          }
          const { data: profile } = await supabase
            .from("profiles")
            .select("email, stripe_customer_id")
            .eq("id", userId)
            .single();
          const origin = new URL(request.url).origin;
          const session = await createStripeCheckoutSession({
            userId,
            email: profile?.email ?? "",
            planId: plan.id,
            planName: plan.name,
            amountUsdCents: plan.price_usd_cents,
            successUrl: input.success_url ?? `${origin}/financeiro?stripe=success`,
            cancelUrl: input.cancel_url ?? `${origin}/pricing?stripe=cancel`,
            recurring: input.recurring ?? true,
            customerId: profile?.stripe_customer_id ?? null,
          });

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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
              mode: input.recurring ?? true ? "subscription" : "payment",
              source: "api_v1",
            },
          });

          return jsonOk(
            {
              provider: "stripe",
              currency: "USD",
              amount_cents: plan.price_usd_cents,
              checkout_url: session.url,
              session_id: session.sessionId,
            },
            { requestId },
          );
        }

        // BRL — SyncPay
        if (!input.cpf || !input.phone) {
          throw new ApiError(
            "validation_error",
            "CPF e telefone são obrigatórios para pagamentos em BRL.",
            422,
          );
        }
        const { createPixPayment } = await import("@/lib/payments.functions");
        // Reuses the existing server function through direct call (same context).
        const result = await createPixPayment({
          data: { planId: input.plan_id, cpf: input.cpf, phone: input.phone },
        });
        return jsonOk(
          {
            provider: "syncpay",
            currency: "BRL",
            amount_cents: result.amountCents,
            payment_id: result.paymentId,
            pix_code: result.pixCode,
          },
          { requestId },
        );
      }),
    },
  },
});
