import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { BrandLogo } from "@/components/BrandLogo";
import { 
  Sparkles, 
  Search, 
  Send, 
  Globe, 
  ArrowRight,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";
import { useState, useEffect } from "react";

const SITE_URL = "https://monzart.com.br";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BlogAI Pro — IA Premium para Blogueiros Profissionais" },
      {
        name: "description",
        content: "A maneira mais inteligente de criar conteúdo para Blogger com Inteligência Artificial e SEO automático.",
      },
      { property: "og:title", content: "BlogAI Pro — Inteligência Artificial para Blogger" },
      { property: "og:description", content: "Gere artigos otimizados para SEO e publique em segundos no seu blog." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/` },
      { property: "og:image", content: `${SITE_URL}/og-image.jpg` },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/` }],
  }),
  component: ProfessionalLandingPage,
});

const FEATURES = [
  {
    icon: Sparkles,
    title: "IA especializada em Blogger",
    desc: "Algoritmos treinados para o formato do Blogger.",
  },
  {
    icon: Search,
    title: "SEO Inteligente",
    desc: "Otimização automática de palavras-chave e tags.",
  },
  {
    icon: Send,
    title: "Publicação Automática",
    desc: "Envio direto para seu blog com apenas um clique.",
  },
  {
    icon: Globe,
    title: "Integração com Google",
    desc: "Conexão oficial e segura com Search Console.",
  },
];

// Screenshots reais do sistema (usando caminhos conhecidos ou placeholders se necessário)
// Nota: Como não encontramos arquivos .png na public/, usaremos o OG image como demonstração
// ou sugerimos ao usuário subir os arquivos reais.
const SCREENSHOTS = [
  { url: "/og-image.jpg", alt: "Painel BlogAI Pro" },
];

function ProfessionalLandingPage() {
  const { t } = useTranslation();
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SCREENSHOTS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 overflow-x-hidden">
      {/* Background Animado Leve */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-teal-500/5 blur-[120px] rounded-full animate-pulse [animation-delay:2s]" />
        
        {/* Partículas Discretas */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
      </div>

      {/* Navbar Minimalista */}
      <header className="container mx-auto px-6 py-8 flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-700">
        <BrandLogo className="scale-110" />
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild className="hidden sm:inline-flex hover:bg-emerald-500/5 transition-colors">
            <Link to="/login">{t("auth.login", "Entrar")}</Link>
          </Button>
          <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95">
            <Link to="/signup">Começar Gratuitamente</Link>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-6 pt-16 pb-24 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Badge */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-semibold"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Versão 1.2 Enterprise Ready</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-6xl lg:text-7xl font-display font-extrabold tracking-tight leading-[1.1] text-foreground"
          >
            A maneira mais inteligente de criar conteúdo para <span className="text-emerald-600">Blogger</span> com IA.
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
          >
            Transforme suas ideias em artigos profissionais otimizados para SEO e publicados automaticamente. Economize horas de trabalho manual com tecnologia de elite.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center pt-4"
          >
            <Button asChild size="xl" className="h-14 px-10 text-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95">
              <Link to="/signup">
                Começar Gratuitamente <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="xl" className="h-14 px-10 text-lg border-2 hover:bg-emerald-500/5 transition-all active:scale-95">
              <Link to="/login">Entrar na Plataforma</Link>
            </Button>
          </motion.div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-32 max-w-6xl mx-auto">
          {FEATURES.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.4 + idx * 0.1 }}
              className="group p-6 rounded-2xl bg-card border border-border/50 hover:border-emerald-500/30 hover:shadow-elegant transition-all duration-300 text-left relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 mb-4 group-hover:scale-110 transition-transform">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-lg mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Screenshots Section */}
        <div className="mt-32 space-y-8 animate-in fade-in duration-1000 slide-in-from-bottom-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted border border-border text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
            Preview Real da Plataforma
          </div>
          
          <div className="relative max-w-5xl mx-auto rounded-2xl overflow-hidden border border-border/50 shadow-2xl shadow-emerald-500/5 bg-card/50 backdrop-blur-sm group">
            <AnimatePresence mode="wait">
              <motion.img
                key={currentSlide}
                src={SCREENSHOTS[currentSlide].url}
                alt={SCREENSHOTS[currentSlide].alt}
                initial={{ opacity: 0, filter: "blur(10px)" }}
                animate={{ opacity: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, filter: "blur(10px)" }}
                transition={{ duration: 0.8 }}
                className="w-full h-auto aspect-video object-cover"
              />
            </AnimatePresence>
            
            {/* Glass Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-background/20 via-transparent to-transparent pointer-events-none" />
            <div className="absolute top-4 left-4 flex gap-1.5 opacity-50">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            </div>
          </div>
          
          <div className="flex justify-center gap-2">
            {SCREENSHOTS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`w-2 h-2 rounded-full transition-all ${currentSlide === idx ? "w-8 bg-emerald-600" : "bg-border"}`}
                aria-label={`Ver print ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </main>

      {/* Footer Profissional */}
      <footer className="border-t border-border/40 mt-12 bg-card/30 backdrop-blur-md">
        <div className="container mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-4 text-center md:text-left">
              <BrandLogo className="justify-center md:justify-start opacity-80" />
              <p className="text-sm text-muted-foreground max-w-xs">
                Potencializando blogueiros ao redor do mundo com o que há de mais moderno em IA generativa.
              </p>
            </div>
            
            <nav className="flex flex-wrap justify-center gap-x-8 gap-y-4">
              <Link to="/legal/privacidade" className="text-sm text-muted-foreground hover:text-emerald-600 transition-colors">Privacidade</Link>
              <Link to="/legal/termos" className="text-sm text-muted-foreground hover:text-emerald-600 transition-colors">Termos</Link>
              <Link to="/legal/cookies" className="text-sm text-muted-foreground hover:text-emerald-600 transition-colors">Cookies</Link>
              <Link to="/legal/sobre" className="text-sm text-muted-foreground hover:text-emerald-600 transition-colors">Sobre</Link>
              <Link to="/suporte" className="text-sm text-muted-foreground hover:text-emerald-600 transition-colors">Suporte</Link>
            </nav>
          </div>
          
          <div className="mt-12 pt-8 border-t border-border/20 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground font-medium">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>SaaS Seguro e Auditado</span>
            </div>
            <p>© {new Date().getFullYear()} BlogAI Pro. Criado por Júnnior Monzart.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
