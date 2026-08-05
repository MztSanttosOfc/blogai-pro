import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Quote } from "lucide-react";

const TESTIMONIALS = [
  {
    name: "Ricardo Souza",
    role: "Blogueiro de Viagens",
    text: "O BlogAI Pro mudou minha produtividade. O que levava dias agora faço em minutos, com um SEO impecável que o Google adora.",
    avatar: "https://i.pravatar.cc/150?u=ricardo"
  },
  {
    name: "Ana Martins",
    role: "Especialista em Marketing",
    text: "A integração com o Search Console é o diferencial. Consigo ver o resultado da IA diretamente no tráfego real do meu blog.",
    avatar: "https://i.pravatar.cc/150?u=ana"
  },
  {
    name: "Carlos Eduardo",
    role: "Dono de Rede de Blogs",
    text: "Escalar conteúdo era meu maior gargalo. Com a automação do BlogAI Pro, tripliquei meu faturamento com AdSense em 3 meses.",
    avatar: "https://i.pravatar.cc/150?u=carlos"
  }
];

export function Testimonials() {
  const { t } = useTranslation("landing");

  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl md:text-5xl font-bold mb-6">
            Aprovado por <span className="text-emerald-400">especialistas</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-8 rounded-[2rem] bg-white/[0.03] border border-white/5 relative group hover:bg-white/[0.05] transition-colors"
            >
              <Quote className="w-10 h-10 text-emerald-500/20 absolute top-6 right-8 group-hover:text-emerald-500/40 transition-colors" />
              
              <div className="flex items-center gap-1 mb-6">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-4 h-4 fill-emerald-400 text-emerald-400" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              <p className="text-muted-foreground leading-relaxed mb-8 italic">
                "{t.text}"
              </p>

              <div className="flex items-center gap-4">
                <img src={t.avatar} alt={t.name} className="w-12 h-12 rounded-full border border-white/10" />
                <div>
                  <h4 className="font-bold text-white">{t.name}</h4>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
