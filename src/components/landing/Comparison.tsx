import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Clock, Zap, Check, X } from "lucide-react";

export function Comparison() {
  const { t } = useTranslation("landing");

  const manualItems = [
    "manual.i1", "manual.i2", "manual.i3", "manual.i4", "manual.i5", "manual.i6", "manual.i7"
  ];

  const proItems = [
    "pro.i1", "pro.i2", "pro.i3", "pro.i4", "pro.i5", "pro.i6", "pro.i7"
  ];

  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-4">
        <div className="text-center mb-20">
          <h2 className="font-display text-3xl md:text-5xl font-bold mb-6">
            O fim do trabalho <span className="text-destructive/80">repetitivo</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Compare o processo tradicional com a eficiência da nossa Inteligência Artificial.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Manual Side */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="p-8 rounded-[2rem] bg-white/5 border border-white/5 backdrop-blur-sm grayscale opacity-70"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Método Manual</div>
                <div className="text-2xl font-bold text-white">Lento & Exaustivo</div>
              </div>
              <div className="flex flex-col items-end">
                <Clock className="text-destructive w-6 h-6 mb-1" />
                <span className="text-sm font-bold text-destructive">≈ 4 horas</span>
              </div>
            </div>
            
            <ul className="space-y-4">
              {manualItems.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-white/40">
                  <X className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                  {t(`versus.manual.items.${i}`)}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Pro Side */}
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="p-8 rounded-[2rem] bg-emerald-500/5 border border-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.1)] relative"
          >
            <div className="absolute -top-4 -right-4 bg-emerald-500 text-black text-[10px] font-black px-3 py-1 rounded-full shadow-lg">
              96% MAIS RÁPIDO
            </div>
            
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1">BlogAI Pro</div>
                <div className="text-2xl font-bold text-white">Instantâneo & Inteligente</div>
              </div>
              <div className="flex flex-col items-end">
                <Zap className="text-emerald-400 w-6 h-6 mb-1 fill-emerald-400" />
                <span className="text-sm font-bold text-emerald-400">≈ 2 minutos</span>
              </div>
            </div>
            
            <ul className="space-y-4">
              {proItems.map((item, i) => (
                <motion.li 
                  key={i} 
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-3 text-sm text-emerald-50/80"
                >
                  <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  {t(`versus.pro.items.${i}`)}
                </motion.li>
              ))}
            </ul>

            <div className="mt-8 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/10 text-center text-xs font-bold text-emerald-400">
              RESULTADO: +118 HORAS ECONOMIZADAS/MÊS
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
