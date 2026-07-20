// BlogAI Pro v1.1 — hook global de moeda preferida.
// Persiste em localStorage e auto-detecta pelo idioma do navegador na primeira visita.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { detectBrowserCurrency, isSupportedCurrency, type SupportedCurrency } from "@/lib/currency";

const STORAGE_KEY = "blogai:preferred-currency";

interface CurrencyCtx {
  currency: SupportedCurrency;
  setCurrency: (c: SupportedCurrency) => void;
}

const Ctx = createContext<CurrencyCtx | null>(null);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<SupportedCurrency>("BRL");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (isSupportedCurrency(stored)) {
        setCurrencyState(stored);
        return;
      }
    } catch {
      /* ignore */
    }
    setCurrencyState(detectBrowserCurrency());
  }, []);

  const setCurrency = useCallback((c: SupportedCurrency) => {
    setCurrencyState(c);
    try {
      localStorage.setItem(STORAGE_KEY, c);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(() => ({ currency, setCurrency }), [currency, setCurrency]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCurrency(): CurrencyCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Fallback seguro fora do provider (SSR, testes).
    return { currency: "BRL", setCurrency: () => {} };
  }
  return ctx;
}
