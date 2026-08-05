import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FinalCta() {
  const { t } = useTranslation("landing");

  return (
    <section className="py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-emerald-500/5" />
      <div className="container mx-auto px-4 relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto p-12 md:p-20 rounded-[3rem] bg-black/40 border border-white/10 backdrop-blur-3xl shadow-2xl"
        >
          <Sparkles className="w-12 h-12 text-emerald-400 mx-auto mb-8" />
          <h2 className="font-display text-4xl md:text-6xl font-bold mb-8">
            {t("finalCta.title")}
          </h2>
          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
            {t("finalCta.subtitle")}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="xl" className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl px-10 text-lg">
              {t("finalCta.primary")} <ArrowRight className="ml-2" />
            </Button>
            <Button size="xl" variant="ghost" className="text-lg">
              {t("finalCta.secondary")}
            </Button>
          </div>
          <p className="mt-8 text-sm text-muted-foreground/50">{t("finalCta.microcopy1")}</p>
        </motion.div>
      </div>
    </section>
  );
}
