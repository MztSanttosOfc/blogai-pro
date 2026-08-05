import { motion, useScroll, useTransform } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Sparkles, ArrowRight, Play, Check, Star, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LiveAiDemo } from "./LiveAiDemo";
import { useRef } from "react";

export function Hero() {
  const { t } = useTranslation("landing");
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const rotateX = useTransform(scrollYProgress, [0, 1], [0, 20]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.9]);

  return (
    <section 
      ref={containerRef}
      className="relative min-h-[120vh] flex flex-col items-center justify-start overflow-hidden pt-32 pb-20"
    >
      {/* Background Dynamics */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_0%,oklch(0.62_0.15_155/0.15)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,oklch(0.55_0.05_295/0.03)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.55_0.05_295/0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
        
        {/* Animated Glows */}
        <motion.div 
          animate={{ 
            opacity: [0.3, 0.5, 0.3],
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-emerald-500/10 blur-[120px] rounded-full" 
        />
        <motion.div 
          animate={{ 
            opacity: [0.2, 0.4, 0.2],
            scale: [1.2, 1, 1.2],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-500/10 blur-[120px] rounded-full" 
        />
      </div>

      <div className="container relative z-10 mx-auto px-4 text-center mb-20">
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

          <h1 className="max-w-4xl mx-auto font-display text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.05] mb-8">
            <span className="inline-block text-foreground drop-shadow-sm">{t("hero.titlePre")}</span>{" "}
            <span className="relative inline-block">
              <span className="relative z-10 bg-gradient-to-r from-emerald-400 via-teal-400 to-blue-500 bg-clip-text text-transparent">
                {t("hero.titleAccent")}
              </span>
              <motion.div 
                className="absolute -bottom-2 left-0 w-full h-1.5 bg-emerald-500/20 rounded-full blur-sm"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ delay: 0.8, duration: 1 }}
              />
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground/70 mb-12 leading-relaxed">
            {t("hero.subtitle")}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Button size="xl" className="group relative overflow-hidden bg-emerald-500 hover:bg-emerald-600 text-white border-none shadow-[0_0_30px_rgba(16,185,129,0.4)] px-8 font-bold text-lg">
              <span className="relative z-10 flex items-center gap-2">
                {t("hero.primaryCta")} <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            </Button>
            <Button size="xl" variant="outline" className="border-emerald-500/20 hover:bg-emerald-500/5 backdrop-blur-sm px-8 text-lg font-medium group">
              <Play className="mr-2 h-5 w-5 fill-foreground group-hover:scale-110 transition-transform" /> {t("hero.secondaryCta")}
            </Button>
          </div>

          {/* Social Proof Stats */}
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-black bg-emerald-900 overflow-hidden">
                    <img src={`https://i.pravatar.cc/100?u=blogai${i}`} alt="user" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <div className="text-left text-xs">
                <div className="flex text-yellow-500">
                  {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-3 h-3 fill-current" />)}
                </div>
                <div className="text-white font-bold">+3.2k usuários felizes</div>
              </div>
            </div>
            <div className="text-xs font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-2">
              <Zap className="w-4 h-4 fill-emerald-400" /> 96% mais rápido
            </div>
            <div className="text-xs font-bold uppercase tracking-widest text-blue-400 flex items-center gap-2">
              <Check className="w-4 h-4" /> SEO 100% Otimizado
            </div>
          </div>
        </motion.div>
      </div>

      {/* Floating Notebook Mockup */}
      <motion.div
        style={{ y, rotateX, scale }}
        className="relative w-full max-w-6xl mx-auto px-4 perspective-[2000px]"
      >
        <div className="relative rounded-t-[2.5rem] rounded-b-[1rem] border-[12px] border-[#1a191f] bg-[#1a191f] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.05)] overflow-hidden">
          {/* Laptop Lid Inner */}
          <div className="relative aspect-video bg-[#0b0a14] rounded-[1.5rem] overflow-hidden border border-white/5">
            <LiveAiDemo />
            
            {/* Screen Reflections */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-transparent via-white/5 to-white/10" />
          </div>
        </div>
        
        {/* Laptop Base */}
        <div className="relative h-4 w-full bg-[#1a191f] rounded-b-[2rem] shadow-2xl overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-black/40 rounded-b-xl" />
        </div>

        {/* Shadow under laptop */}
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-[90%] h-20 bg-emerald-500/10 blur-[60px] rounded-full opacity-50" />
      </motion.div>
    </section>
  );
}
