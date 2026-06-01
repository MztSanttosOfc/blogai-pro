import { createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { PLANS } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/pricing")({
  head: () => ({
    meta: [{ title: "Assinatura — BlogAI Pro" }],
  }),
  component: PricingPage,
});

function PricingPage() {
  const { profile } = useAuth();

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold md:text-3xl">Escolha o plano ideal</h1>
        <p className="text-muted-foreground">
          Mais créditos, mais artigos, mais alcance para o seu blog.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {PLANS.map((plan) => {
          const current = profile?.plan === plan.id;
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
                  Mais popular
                </Badge>
              )}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <plan.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold">{plan.name}</h3>
              </div>
              <div className="mt-4 flex items-end gap-1">
                <span className="font-display text-3xl font-bold">{plan.price}</span>
                <span className="mb-1 text-sm text-muted-foreground">{plan.period}</span>
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
                disabled={current}
                onClick={() => toast.info("Pagamentos em breve! Em breve você poderá assinar este plano.")}
              >
                {current ? "Plano atual" : "Assinar"}
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
