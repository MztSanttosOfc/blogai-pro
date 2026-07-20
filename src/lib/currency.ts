// BlogAI Pro — v1.1: helpers de moeda (BRL/USD).
// Client-safe. Sem dependências server-only.

export type SupportedCurrency = "BRL" | "USD";

export const SUPPORTED_CURRENCIES: SupportedCurrency[] = ["BRL", "USD"];

const BRL_LOCALES = new Set(["pt-BR", "pt", "pt-br"]);

/**
 * Detecta moeda preferida do navegador. BRL para pt-BR, USD para o resto.
 * Nunca lança — sempre retorna um valor válido.
 */
export function detectBrowserCurrency(): SupportedCurrency {
  if (typeof navigator === "undefined") return "BRL";
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language ?? "pt-BR"];
  for (const l of langs) {
    if (BRL_LOCALES.has(l.toLowerCase())) return "BRL";
  }
  return "USD";
}

export function isSupportedCurrency(v: unknown): v is SupportedCurrency {
  return typeof v === "string" && (SUPPORTED_CURRENCIES as string[]).includes(v);
}

export function formatMoneyCents(cents: number, currency: SupportedCurrency): string {
  const value = (cents ?? 0) / 100;
  const locale = currency === "BRL" ? "pt-BR" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export interface PlanPriceInput {
  price_cents: number | null | undefined;
  price_usd_cents?: number | null;
}

/**
 * Escolhe preço apropriado para a moeda. Se a moeda alvo não tiver preço
 * definido, faz fallback para BRL para preservar comportamento antigo.
 */
export function resolvePlanPriceCents(
  plan: PlanPriceInput,
  currency: SupportedCurrency,
): { cents: number; currency: SupportedCurrency } {
  if (currency === "USD" && typeof plan.price_usd_cents === "number" && plan.price_usd_cents > 0) {
    return { cents: plan.price_usd_cents, currency: "USD" };
  }
  return { cents: plan.price_cents ?? 0, currency: "BRL" };
}
