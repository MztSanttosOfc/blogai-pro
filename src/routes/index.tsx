import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  Wand2,
  Search,
  Send,
  DollarSign,
  Globe,
  Zap,
  ArrowRight,
  Check,
  Star,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PLANS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { HowItWorksModal } from "@/components/HowItWorksModal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BlogAI Pro — Crie, otimize e publique blogs com IA" },
      {
        name: "description",
        content:
          "BlogAI Pro ajuda blogueiros do Blogger a criar artigos otimizados para SEO, publicar e monetizar de forma automatizada com inteligência artificial.",
      },
      { property: "og:title", content: "BlogAI Pro — Conteúdo de blog com IA" },
      {
        property: "og:description",
        content: "Gere artigos otimizados para SEO em minutos e publique no Blogger.",
      },
      { property: "og:url", content: "https://monzart.com.br/" },
      { rel: "canonical", href: "https://monzart.com.br/" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "BlogAI Pro",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          description:
            "Crie, otimize, publique e monetize blogs do Blogger com inteligência artificial.",
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "BRL",
          },
        }),
      },
    ],
  }),
  component: LandingPage,
});

const FEATURES = [
  {
    icon: Wand2,
    title: "Gerador com IA",
    desc: "Artigos completos a partir de uma palavra-chave, com estrutura, tom e idioma sob medida.",
  },
  {
    icon: Search,
    title: "SEO automático",
    desc: "Títulos, meta descrição, headings, FAQ e tags otimizados para ranquear no Google.",
  },
  {
    icon: Send,
    title: "Publicação no Blogger",
    desc: "Envie seus artigos direto para o Blogger sem sair da plataforma.",
  },
  {
    icon: DollarSign,
    title: "Monetização",
    desc: "Estratégias e estrutura prontas para você ganhar mais com o seu conteúdo.",
  },
  {
    icon: Globe,
    title: "Múltiplos idiomas",
    desc: "Crie conteúdo em português, inglês, espanhol e muito mais com um clique.",
  },
  {
    icon: Zap,
    title: "Rápido e simples",
    desc: "Da ideia ao artigo publicado em minutos. Sem complicação, sem bloqueio criativo.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Digite a palavra-chave",
    desc: "Informe o tema principal, escolha o tom e o tamanho do artigo.",
  },
  {
    n: "02",
    title: "A IA escreve para você",
    desc: "Em segundos você recebe um artigo completo e otimizado para SEO.",
  },
  {
    n: "03",
    title: "Publique e monetize",
    desc: "Revise, envie para o Blogger e comece a atrair tráfego.",
  },
];

function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [howOpen, setHowOpen] = useState(false);
  const handleStart = () => navigate({ to: user ? "/dashboard" : "/login" });
  return (
    <div className="min-h-screen bg-background">
      <HowItWorksModal open={howOpen} onOpenChange={setHowOpen} />
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
          <BrandLogo />
          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <a href="#recursos" className="transition-colors hover:text-foreground">
              Recursos
            </a>
            <a href="#como-funciona" className="transition-colors hover:text-foreground">
              Como funciona
            </a>
            <a href="#planos" className="transition-colors hover:text-foreground">
              Planos
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/login">Entrar</Link>
            </Button>
            <Button asChild variant="hero" size="sm">
              <Link to="/signup">Começar grátis</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-glow" aria-hidden />
        <div className="mx-auto max-w-6xl px-4 py-20 text-center md:px-6 md:py-28">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <Badge variant="secondary" className="mb-6 gap-1.5 px-4 py-1.5 text-sm">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Inteligência artificial para blogueiros do Blogger
            </Badge>
            <h1 className="mx-auto max-w-3xl font-display text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
              Crie blogs incríveis com{" "}
              <span className="text-gradient">inteligência artificial</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              O BlogAI Pro escreve, otimiza para SEO, publica no Blogger e ajuda você a monetizar —
              tudo de forma automatizada, em minutos.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button variant="hero" size="lg" className="w-full sm:w-auto" onClick={handleStart}>
                Começar agora grátis <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto"
                onClick={() => setHowOpen(true)}
              >
                Ver como funciona
              </Button>
            </div>
            <div className="mt-5 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-warning text-warning" />
                ))}
              </div>
              <span>10 créditos gratuitos ao se cadastrar</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="recursos" className="mx-auto max-w-6xl px-4 py-20 md:px-6">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl">Tudo que seu blog precisa</h2>
          <p className="mt-4 text-muted-foreground">
            Uma plataforma completa para produzir conteúdo de qualidade em escala.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="rounded-2xl border border-border bg-card p-6 shadow-soft transition-shadow hover:shadow-elegant"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="border-y border-border bg-secondary/40">
        <div className="mx-auto max-w-6xl px-4 py-20 md:px-6">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold md:text-4xl">
              Do tema ao artigo publicado em 3 passos
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="relative">
                <span className="font-display text-5xl font-extrabold text-primary/20">{s.n}</span>
                <h3 className="mt-2 text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="planos" className="mx-auto max-w-6xl px-4 py-20 md:px-6">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl">
            Planos para todos os tamanhos
          </h2>
          <p className="mt-4 text-muted-foreground">
            Comece grátis e evolua conforme o seu blog cresce.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                "relative flex flex-col rounded-2xl border border-border bg-card p-6 shadow-soft",
                plan.highlight && "border-primary shadow-elegant",
              )}
            >
              {plan.highlight && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-primary">
                  Mais popular
                </Badge>
              )}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <plan.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold">{plan.name}</h3>
              </div>
              <div className="mt-4 flex items-end gap-1">
                <span className="font-display text-3xl font-bold">{plan.price}</span>
                <span className="mb-1 text-sm text-muted-foreground">{plan.period}</span>
              </div>
              <p className="mt-1 text-sm font-medium text-primary">{plan.credits}</p>
              <ul className="mt-5 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>
              <Button asChild variant={plan.highlight ? "hero" : "outline"} className="mt-6 w-full">
                <Link to="/signup">Começar</Link>
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-20 md:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-hero px-6 py-16 text-center shadow-elegant md:px-12">
          <div className="absolute inset-0 bg-gradient-glow" aria-hidden />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl font-display text-3xl font-bold text-sidebar-foreground md:text-4xl">
              Pronto para acelerar o seu blog?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sidebar-foreground/70">
              Junte-se aos blogueiros que economizam horas todos os dias com o BlogAI Pro.
            </p>
            <Button asChild variant="hero" size="lg" className="mt-8">
              <Link to="/signup">
                Criar minha conta grátis <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 md:flex-row md:px-6">
          <BrandLogo />
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} BlogAI Pro. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
