/**
 * GatewayManager — seleciona automaticamente o gateway de pagamentos
 * a partir da moeda:
 *   • BRL → SyncPay (Pix)
 *   • USD → Stripe (Checkout)
 *
 * Cada gateway continua isolado no seu módulo (syncpay.server.ts /
 * stripe.server.ts). Este arquivo apenas roteia a intenção de pagamento
 * e expõe um shape uniforme para o restante da aplicação.
 */
import type { SupportedCurrency } from "@/lib/currency";
import { resolvePlanPriceCents } from "@/lib/currency";
import { isStripeConfigured } from "@/lib/stripe.server";

export type GatewayProvider = "syncpay" | "stripe";

export interface PlanRow {
  id: string;
  name: string;
  price_cents: number;
  price_usd_cents: number | null;
}

export interface GatewayDecision {
  provider: GatewayProvider;
  currency: SupportedCurrency;
  amountCents: number;
}

/** Retorna o gateway correto para o par (plano, moeda). */
export function selectGateway(
  plan: PlanRow,
  currency: SupportedCurrency,
): GatewayDecision {
  const resolved = resolvePlanPriceCents(plan, currency);
  const provider: GatewayProvider = resolved.currency === "USD" ? "stripe" : "syncpay";
  return {
    provider,
    currency: resolved.currency,
    amountCents: resolved.cents,
  };
}

/** True se o gateway internacional (Stripe) está pronto para uso. */
export function isInternationalGatewayReady(): boolean {
  return isStripeConfigured();
}
