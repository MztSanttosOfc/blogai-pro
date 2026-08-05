import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Check, Zap, Star, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";

export function Pricing() {
  const { t } = useTranslation("landing");

  const plans = [
    {
      id: "free",
      name: "Free",
      price: "R$ 0",
      credits: "10",
      features: ["seo", "ai", "i18n"],
      color: "border-white/5 bg-white/5",
      icon: Zap,
    },
    {
      id: "pro",
      name: "Pro",
      price: "R$ 49",
      credits: "150",
      features: ["seo", "ai", "publish", "support"],
      color: "border-emerald-500/20 bg-emerald-500/5",
      popular: true,
      icon: Star,
    },
    {
      id: "premium",
      name: "Premium",
      price: "R$ 97",
      credits: "∞",
      features: ["seo", "ai", "publish", "scheduler", "monetization", "support_priority"],
      color: "border-blue-500/20 bg-blue-500/5",
      icon: Shield,
    }
  ];

  return (
    <section id="planos" className="py-32 relative">
      <div className="container mx-auto px-4">
        <div className="text-center mb-20">
          <h2 className="font-display text-4xl md:text-6xl font-bold mb-6">
            Investimento que se <span className="text-emerald-400">paga sozinho</span>
          </h2>
          <p className="text-muted-foreground text-xl max-w-2xl mx-auto">
            Escolha o plano ideal para a escala do seu negócio.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={cn(
                "relative p-8 rounded-[2.5rem] border backdrop-blur-3xl flex flex-col group hover:scale-[1.02] transition-transform duration-500",
                plan.color
              )}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-black text-[10px] font-black px-4 py-1 rounded-full shadow-lg">
                  MAIS ESCOLHIDO
                </div>
              )}

              <div className="mb-8">
                <plan.icon className={cn(
                  "w-10 h-10 mb-4",
                  plan.id === "free" ? "text-white/40" : plan.id === "pro" ? "text-emerald-400" : "text-blue-400"
                )} />
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground text-sm">/mês</span>
                </div>
              </div>

              <div className="mb-8 p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Créditos</div>
                <div className="text-2xl font-bold text-emerald-400">{plan.credits}</div>
              </div>

              <ul className="space-y-4 mb-10 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-3 text-sm text-white/70">
                    <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    {t(`compare.rows.${f}`)}
                  </li>
                ))}
              </ul>

              <Button 
                asChild
                size="xl" 
                variant={plan.popular ? "default" : "outline"}
                className={cn(
                  "w-full rounded-2xl",
                  plan.popular ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "border-white/10 hover:bg-white/5"
                )}
              >
                <Link to="/signup">{plan.id === "free" ? t("pricing.ctaFree") : t("pricing.cta")}</Link>
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
