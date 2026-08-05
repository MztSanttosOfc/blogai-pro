import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Sparkles, ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function Hero() {
  const { t } = useTranslation("landing");

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden py-20">
      {/* Background Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_0%,oklch(0.62_0.15_155/0.15)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,oklch(0.55_0.05_295/0.03)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.55_0.05_295/0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
      </div>

      <div className="container relative z-10 mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <Badge 
            variant="outline" 
            className="mb-8 px-4 py-1.5 border-emerald-500/20 bg-emerald-500/5 text-emerald-400 backdrop-blur-sm"
          >
            <Sparkles className="mr-2 h-3.5 w-3.5 fill-emerald-400" />
            {t("hero.badge")}
          </Badge>

          <h1 className="max-w-4xl mx-auto font-display text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.1] mb-8">
            <span className="inline-block text-foreground">{t("hero.titlePre")}</span>{" "}
            <span className="inline-block bg-gradient-to-r from-emerald-400 via-teal-400 to-blue-500 bg-clip-text text-transparent">
              {t("hero.titleAccent")}
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground/80 mb-12 leading-relaxed">
            {t("hero.subtitle")}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
            <Button size="xl" className="group relative overflow-hidden bg-emerald-500 hover:bg-emerald-600 text-white border-none shadow-[0_0_20px_rgba(16,185,129,0.3)] px-8">
              <span className="relative z-10 flex items-center gap-2">
                {t("hero.primaryCta")} <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            </Button>
            <Button size="xl" variant="outline" className="border-emerald-500/20 hover:bg-emerald-500/5 backdrop-blur-sm px-8">
              <Play className="mr-2 h-4 w-4 fill-foreground" /> {t("hero.secondaryCta")}
            </Button>
          </div>
        </motion.div>

        {/* Floating Notebook Mockup Placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative max-w-6xl mx-auto"
        >
          <div className="absolute -inset-1 bg-gradient-to-b from-emerald-500/20 to-transparent blur-2xl opacity-50" />
          <div className="relative aspect-video rounded-2xl border border-white/10 bg-black/40 backdrop-blur-3xl overflow-hidden shadow-2xl">
            {/* Interactive Demo Content will go here */}
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              [Simulador IA BlogAI Pro]
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
