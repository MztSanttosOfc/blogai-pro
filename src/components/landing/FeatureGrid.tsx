import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Wand2, Search, Send, BarChart3, DollarSign, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

const features = [
  { key: "ai", icon: Wand2, color: "from-emerald-400 to-teal-400" },
  { key: "seo", icon: Search, color: "from-blue-400 to-indigo-400" },
  { key: "publish", icon: Send, color: "from-purple-400 to-pink-400" },
  { key: "performance", icon: BarChart3, color: "from-yellow-400 to-orange-400" },
  { key: "monetization", icon: DollarSign, color: "from-emerald-400 to-green-500" },
  { key: "i18n", icon: Globe, color: "from-cyan-400 to-blue-500" },
];

export function FeatureGrid() {
  const { t } = useTranslation("landing");

  return (
    <section className="py-32 relative">
      <div className="container mx-auto px-4">
        <div className="text-center mb-24">
          <h2 className="font-display text-4xl md:text-6xl font-bold mb-6">
            Poder de <span className="text-emerald-400">Nível Enterprise</span>
          </h2>
          <p className="text-muted-foreground text-xl max-w-3xl mx-auto">
            Uma suíte completa de ferramentas que transformam o seu blog em uma máquina de tráfego e receita.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <motion.div
              key={f.key}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -5 }}
              className="group relative p-8 rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-xl hover:bg-white/[0.04] transition-all overflow-hidden"
            >
              {/* Background Glow */}
              <div className={cn(
                "absolute -right-20 -top-20 w-40 h-40 bg-gradient-to-br blur-[80px] opacity-0 group-hover:opacity-20 transition-opacity",
                f.color
              )} />

              <div className={cn(
                "w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform",
                f.color
              )}>
                <f.icon className="w-7 h-7 text-black" />
              </div>

              <h3 className="text-xl font-bold mb-4 group-hover:text-emerald-400 transition-colors">
                {t(`benefits.items.${f.key}.title`)}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {t(`benefits.items.${f.key}.desc`)}
              </p>

              <div className="mt-8 flex items-center gap-2 text-xs font-bold text-emerald-400/50 group-hover:text-emerald-400 transition-colors cursor-pointer">
                SAIBA MAIS <ArrowRight className="w-3 h-3" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

import { ArrowRight } from "lucide-react";
