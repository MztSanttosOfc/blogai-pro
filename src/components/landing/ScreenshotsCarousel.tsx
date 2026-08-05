import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Layout, LineChart, Cpu, Zap, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

const SCREENS = [
  {
    title: "Dashboard Inteligente",
    icon: LineChart,
    color: "from-emerald-400 to-teal-500",
    desc: "Métricas reais do Google Search Console integradas."
  },
  {
    title: "Gerador SEO",
    icon: Cpu,
    color: "from-blue-400 to-indigo-500",
    desc: "A inteligência artificial que escreve e otimiza."
  },
  {
    title: "Biblioteca de Artigos",
    icon: Layout,
    color: "from-purple-400 to-pink-500",
    desc: "Gerencie milhares de conteúdos em um só lugar."
  }
];

export function ScreenshotsCarousel() {
  const { t } = useTranslation("landing");

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl md:text-5xl font-bold mb-6">
            Interface <span className="text-emerald-400">Premium</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Desenvolvido para profissionais que não aceitam nada menos que a perfeição visual e funcional.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {SCREENS.map((screen, i) => (
            <motion.div
              key={screen.title}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative aspect-video rounded-3xl bg-white/[0.02] border border-white/5 overflow-hidden group"
            >
              {/* Fake UI Container */}
              <div className="absolute inset-0 p-1">
                <div className="h-full w-full rounded-[1.4rem] bg-[#0A0A0A] border border-white/5 flex flex-col">
                  {/* Header */}
                  <div className="p-3 border-b border-white/5 flex items-center justify-between">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-red-500/50" />
                      <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                      <div className="w-2 h-2 rounded-full bg-green-500/50" />
                    </div>
                    <div className="w-32 h-2 rounded-full bg-white/5" />
                  </div>
                  {/* Content Placeholder */}
                  <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
                    <div className={cn("p-4 rounded-2xl bg-gradient-to-br mb-4 shadow-2xl", screen.color)}>
                      <screen.icon className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="font-bold text-white mb-2">{screen.title}</h3>
                    <p className="text-xs text-muted-foreground max-w-[180px]">{screen.desc}</p>
                  </div>
                </div>
              </div>

              {/* Hover Effect Overlay */}
              <div className="absolute inset-0 bg-emerald-500/0 group-hover:bg-emerald-500/5 transition-colors duration-500" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
