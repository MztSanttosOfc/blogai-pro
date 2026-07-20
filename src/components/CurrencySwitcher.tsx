import { DollarSign } from "lucide-react";
import { useCurrency } from "@/hooks/use-currency";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";
import { cn } from "@/lib/utils";

interface CurrencySwitcherProps {
  className?: string;
}

/** Toggle simples entre BRL e USD. Persiste no localStorage via useCurrency. */
export function CurrencySwitcher({ className }: CurrencySwitcherProps) {
  const { currency, setCurrency } = useCurrency();
  return (
    <div
      role="group"
      aria-label="Moeda"
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-muted/40 p-1 text-xs font-medium",
        className,
      )}
    >
      <DollarSign className="ml-2 h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      {SUPPORTED_CURRENCIES.map((c) => {
        const active = c === currency;
        return (
          <button
            key={c}
            type="button"
            onClick={() => setCurrency(c)}
            aria-pressed={active}
            className={cn(
              "rounded-full px-3 py-1 transition",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {c}
          </button>
        );
      })}
    </div>
  );
}
