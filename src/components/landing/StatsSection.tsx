import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Zap, Search, Send, BarChart3, DollarSign, Globe, Star } from "lucide-react";
import { cn } from "@/lib/utils";

const stats = [
  { value: "500.000+", label: "stats.articles", icon: FileText },
  { value: "20.000+", label: "stats.users", icon: Users },
  { value: "15M+", label: "stats.words", icon: Zap },
  { value: "98%", label: "stats.satisfaction", icon: Star },
];

export function StatsSection() {
  const { t } = useTranslation("landing");
  
  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center group"
            >
              <div className="text-3xl md:text-5xl font-bold bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">
                {t(stat.label)}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
// Note: Imported Lucide components dynamically if missing locally, used standard variants.
import { FileText, Users } from "lucide-react";
