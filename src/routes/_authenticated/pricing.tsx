import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { Check, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useCurrency } from "@/hooks/use-currency";
import { PLANS } from "@/lib/constants";
import { PixCheckoutDialog } from "@/components/PixCheckoutDialog";
import { CurrencySwitcher } from "@/components/CurrencySwitcher";
import { createStripeCheckout } from "@/lib/payments-stripe.functions";

export const Route = createFileRoute("/_authenticated/pricing")({
  head: () => ({
    meta: [{ title: "Assinatura — BlogAI Pro" }],
  }),
  component: PricingPage,
});

function PricingPage() {
  const { t } = useTranslation("pricing");
  const { profile } = useAuth();
  const { currency } = useCurrency();
  const isUSD = currency === "USD";
  const startStripe = useServerFn(createStripeCheckout);
  const [stripeLoading, setStripeLoading] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<{
    planId: "pro" | "premium" | "teste";
    name: string;
    price: string;
  } | null>(null);

  const handleStripe = async (planId: "pro" | "premium" | "teste") => {
    setStripeLoading(planId);
    try {
      const res = await startStripe({ data: { planId } });
      window.location.href = res.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao iniciar checkout.");
      setStripeLoading(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="space-y-3 text-center">
        <h1 className="text-2xl font-bold md:text-3xl">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
        <div className="flex justify-center pt-2">
          <CurrencySwitcher />
        </div>
      </div>

      {isUSD && (
        <div
          className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200"
          role="status"
        >
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <strong>{t("usdSoonBoldPrefix")}</strong> {t("usdNotice")}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {PLANS.map((plan) => {
          const current = profile?.plan === plan.id;
          const isPaid = plan.id === "pro" || plan.id === "premium";
          const canCheckout = isPaid && !isUSD;
          return (
            <Card
              key={plan.id}
              className={cn(
                "relative flex flex-col p-6",
                plan.highlight && "border-primary shadow-elegant",
              )}
            >
              {plan.highlight && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-primary">
                  {t("popular")}
                </Badge>
              )}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <plan.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold">{plan.name}</h3>
              </div>
              <div className="mt-4 flex items-end gap-1">
                {isUSD && isPaid ? (
                  <span className="font-display text-xl font-semibold text-muted-foreground">
                    {t("comingSoon")}
                  </span>
                ) : (
                  <>
                    <span className="font-display text-3xl font-bold">{plan.price}</span>
                    <span className="mb-1 text-sm text-muted-foreground">{plan.period}</span>
                  </>
                )}
              </div>
              <p className="mt-1 text-sm font-medium text-primary">{plan.credits}</p>
              <ul className="mt-5 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                variant={plan.highlight ? "hero" : "outline"}
                className="mt-6 w-full"
                disabled={current || !canCheckout}
                onClick={() =>
                  canCheckout &&
                  setCheckout({
                    planId: plan.id as "pro" | "premium",
                    name: plan.name,
                    price: `${plan.price}${plan.period}`,
                  })
                }
              >
                {current
                  ? t("currentPlan")
                  : isUSD && isPaid
                    ? t("usdSoon")
                    : isPaid
                      ? t("subscribe")
                      : t("freePlan")}
              </Button>
            </Card>
          );
        })}
      </div>

      {!isUSD && (
        <div className="rounded-xl border border-dashed border-muted-foreground/30 bg-muted/30 p-4 text-center">
          <p className="text-sm font-medium">{t("testTitle")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("testHint")}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() =>
              setCheckout({ planId: "teste", name: t("testPlanName"), price: "R$ 1,00" })
            }
          >
            {t("testCta")}
          </Button>
        </div>
      )}

      <PixCheckoutDialog
        open={checkout !== null}
        onOpenChange={(o) => !o && setCheckout(null)}
        planId={checkout?.planId ?? null}
        planName={checkout?.name ?? ""}
        priceLabel={checkout?.price ?? ""}
      />
    </div>
  );
}
