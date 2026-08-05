import { motion, useScroll, useTransform } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LiveAiDemo } from "./LiveAiDemo";
import { useRef } from "react";

export function Hero() {
  const { t } = useTranslation("landing");
  const containerRef = useRef<HTMLDivElement>(null);
  
  return (
    <section 
      ref={containerRef}
      className="relative min-h-[90vh] flex flex-col items-center justify-center overflow-hidden pt-20 pb-20 bg-background"
    >
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_-20%,oklch(0.68_0.21_300/0.05),transparent_60%)]" />

      <div className="container relative z-10 mx-auto px-4 text-center mb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <Badge 
            variant="outline" 
            className="mb-6 px-3 py-1 border-border bg-secondary/50 text-foreground/70"
          >
            {t("hero.badge")}
          </Badge>

          <h1 className="max-w-3xl mx-auto font-display text-5xl md:text-6xl font-bold tracking-tight mb-6">
            <span className="text-foreground">{t("hero.titlePre")} </span>
            <span className="text-primary">{t("hero.titleAccent")}</span>
          </h1>

          <p className="max-w-xl mx-auto text-lg text-muted-foreground mb-10">
            {t("hero.subtitle")}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
            <Button size="xl" className="bg-primary text-primary-foreground hover:bg-primary/90 px-8">
              {t("hero.primaryCta")}
            </Button>
            <Button size="xl" variant="ghost" className="text-foreground hover:bg-secondary">
              {t("hero.secondaryCta")}
            </Button>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.8 }}
        className="relative w-full max-w-5xl mx-auto px-4"
      >
        <div className="relative rounded-2xl border border-border bg-card p-2 shadow-elegant">
          <div className="relative aspect-video bg-background rounded-xl overflow-hidden border border-border/50">
            <LiveAiDemo />
          </div>
        </div>
      </motion.div>
    </section>
  );
}
