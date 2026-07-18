import { createFileRoute } from "@tanstack/react-router";
import {
  Sparkles,
  Rocket,
  Target,
  Compass,
  Globe,
  Mail,
  ExternalLink,
  FileText,
  Award,
  Code2,
  TrendingUp,
  Users,
  Calendar,
  Instagram,
  Youtube,
  Facebook,
  Github,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import creatorPortrait from "@/assets/creator-portrait.jpg";

export const Route = createFileRoute("/_authenticated/criador")({
  head: () => ({
    meta: [
      { title: "Conheça o Criador — BlogAI Pro" },
      {
        name: "description",
        content:
          "Conheça Monzart Santtos, criador do BlogAI Pro — blogueiro, especialista em SEO, monetização e desenvolvedor da plataforma.",
      },
      { property: "og:title", content: "Conheça o Criador — BlogAI Pro" },
      {
        property: "og:description",
        content:
          "A história por trás do BlogAI Pro: quem construiu, por que existe e para onde vamos.",
      },
    ],
  }),
  component: CreatorPage,
});

const STATS = [
  { label: "Anos criando conteúdo", value: "8+", icon: Calendar },
  { label: "Projetos entregues", value: "40+", icon: Rocket },
  { label: "Ferramentas desenvolvidas", value: "12", icon: Code2 },
  { label: "Blogueiros impactados", value: "1k+", icon: Users },
];

const TIMELINE: Array<{ year: string; title: string; description: string }> = [
  {
    year: "2017",
    title: "Primeiros passos no Blogger",
    description:
      "Início da jornada como blogueiro, publicando conteúdos sobre tecnologia, produtividade e SEO.",
  },
  {
    year: "2019",
    title: "Especialização em SEO",
    description:
      "Aprofundamento em SEO técnico, Search Console, Analytics e estratégias de tráfego orgânico.",
  },
  {
    year: "2021",
    title: "Monetização e AdSense",
    description:
      "Estudo intensivo de monetização de blogs com Google AdSense, parcerias e conteúdo evergreen.",
  },
  {
    year: "2023",
    title: "Ferramentas próprias",
    description:
      "Primeiros protótipos internos para automatizar geração de artigos, meta tags e clusters de conteúdo.",
  },
  {
    year: "2025",
    title: "Nasce o BlogAI Pro",
    description:
      "Lançamento oficial da plataforma unindo IA generativa, publicação no Blogger e desempenho SEO em um só lugar.",
  },
  {
    year: "2026",
    title: "Ecossistema oficial",
    description:
      "API pública v1, plugin oficial para WordPress e app Android via Capacitor — pronto para escalar.",
  },
];

const EXPERTISE = [
  {
    icon: FileText,
    title: "Blogger & Conteúdo",
    text: "Anos publicando, otimizando e escalando blogs — do zero à monetização.",
  },
  {
    icon: TrendingUp,
    title: "SEO Técnico",
    text: "Search Console, Core Web Vitals, schema, indexação e clusters de tópicos.",
  },
  {
    icon: Award,
    title: "Monetização",
    text: "AdSense, parcerias e estratégias sustentáveis de receita para criadores.",
  },
  {
    icon: Code2,
    title: "Desenvolvimento",
    text: "React, TypeScript, Supabase e IA aplicada — o BlogAI Pro é 100% autoral.",
  },
];

const PROJECTS = [
  {
    name: "BlogAI Pro",
    role: "Plataforma SaaS de IA para blogueiros",
    url: "https://monzart.com.br",
  },
  {
    name: "Blog Monzart",
    role: "Blog oficial com tutoriais de SEO e Blogger",
    url: "https://blog.monzart.com.br",
  },
  {
    name: "Plugin WordPress BlogAI",
    role: "Integração oficial WP ↔ BlogAI Pro",
    url: "https://monzart.com.br",
  },
];

const SOCIALS = [
  { label: "Site oficial", href: "https://monzart.com.br", icon: Globe },
  { label: "Blog", href: "https://blog.monzart.com.br", icon: FileText },
  {
    label: "Media Kit",
    href: "https://blog.monzart.com.br/p/media-kit-monzart-santtos.html",
    icon: ExternalLink,
  },
  {
    label: "Contato",
    href: "https://blog.monzart.com.br/p/contato_01435481532.html",
    icon: Mail,
  },
  { label: "Instagram", href: "https://instagram.com/monzartsanttos", icon: Instagram },
  { label: "YouTube", href: "https://youtube.com/@monzartsanttos", icon: Youtube },
  { label: "Facebook", href: "https://facebook.com/monzartsanttos", icon: Facebook },
  { label: "GitHub", href: "https://github.com/MztSanttosOfc", icon: Github },
];

function CreatorPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-12 animate-fade-in">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-hero p-6 md:p-10">
        <div className="absolute inset-0 bg-gradient-glow opacity-70" aria-hidden />
        <div className="relative grid gap-8 md:grid-cols-[auto_minmax(0,1fr)] md:items-center">
          <div className="mx-auto md:mx-0">
            <div className="relative">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-primary to-primary/40 blur-lg opacity-70" />
              <img
                src={creatorPortrait}
                alt="Retrato do criador do BlogAI Pro"
                loading="lazy"
                width={1024}
                height={1024}
                className="relative h-40 w-40 rounded-full object-cover shadow-2xl ring-4 ring-white/20 md:h-56 md:w-56"
              />
            </div>
          </div>
          <div className="min-w-0 space-y-4 text-center md:text-left">
            <Badge className="bg-primary/20 text-primary hover:bg-primary/20">
              <Sparkles className="mr-1 h-3 w-3" /> Criador do BlogAI Pro
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight text-white md:text-5xl">
              Monzart Santtos
            </h1>
            <p className="text-base text-white/80 md:text-lg">
              Blogueiro, especialista em SEO, monetização e desenvolvedor por trás do BlogAI Pro —
              a plataforma que une inteligência artificial e produção de conteúdo em escala.
            </p>
            <div className="flex flex-wrap justify-center gap-2 md:justify-start">
              <Button asChild variant="hero" size="lg">
                <a href="https://monzart.com.br" target="_blank" rel="noreferrer">
                  <Globe className="h-4 w-4" /> Visitar site
                </a>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <a
                  href="https://blog.monzart.com.br/p/media-kit-monzart-santtos.html"
                  target="_blank"
                  rel="noreferrer"
                >
                  <FileText className="h-4 w-4" /> Media Kit
                </a>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a
                  href="https://blog.monzart.com.br/p/contato_01435481532.html"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Mail className="h-4 w-4" /> Contato
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {STATS.map((s) => (
          <Card
            key={s.label}
            className="flex flex-col items-start gap-2 p-5 transition-transform hover:-translate-y-0.5"
          >
            <s.icon className="h-5 w-5 text-primary" />
            <p className="text-2xl font-bold md:text-3xl">{s.value}</p>
            <p className="text-xs text-muted-foreground md:text-sm">{s.label}</p>
          </Card>
        ))}
      </section>

      {/* História */}
      <section className="grid gap-6 md:grid-cols-2">
        <Card className="space-y-3 p-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Minha história</h2>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Tudo começou com um único blog no Blogger e a curiosidade de entender por que uns
            artigos apareciam no Google e outros não. Anos depois, dezenas de blogs, milhares de
            posts otimizados e muita leitura de documentação transformaram esse hobby em profissão
            — e a profissão, em produto.
          </p>
        </Card>
        <Card className="space-y-3 p-6">
          <div className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Como surgiu o BlogAI Pro</h2>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            O BlogAI Pro nasceu de uma dor real: publicar com consistência, manter qualidade e
            ainda enxergar dados de SEO sem pular entre 10 abas. Decidi unir IA generativa,
            integração nativa com Blogger e um painel de desempenho conectado ao Google Search
            Console — tudo em uma plataforma só.
          </p>
        </Card>
        <Card className="space-y-3 p-6">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Missão</h2>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Democratizar o acesso a ferramentas profissionais de conteúdo e SEO, permitindo que
            qualquer blogueiro — iniciante ou avançado — publique com qualidade de agência.
          </p>
        </Card>
        <Card className="space-y-3 p-6">
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Visão de futuro</h2>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Tornar o BlogAI Pro o ecossistema oficial de publicação inteligente em português —
            com API pública, plugin WordPress, apps Android e iOS e integrações que respeitam o
            criador de conteúdo.
          </p>
        </Card>
      </section>

      {/* Expertise */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold md:text-2xl">Áreas de atuação</h2>
          <p className="text-sm text-muted-foreground">
            A base técnica e editorial que sustenta cada decisão do BlogAI Pro.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {EXPERTISE.map((e) => (
            <Card key={e.title} className="space-y-2 p-5">
              <e.icon className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">{e.title}</h3>
              <p className="text-xs text-muted-foreground md:text-sm">{e.text}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Timeline */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold md:text-2xl">Trajetória</h2>
          <p className="text-sm text-muted-foreground">
            Uma linha do tempo até o lançamento oficial da versão 1.0.
          </p>
        </div>
        <Card className="p-4 md:p-6">
          <ol className="relative space-y-6 border-l border-border pl-6">
            {TIMELINE.map((item) => (
              <li key={item.year} className="relative">
                <span className="absolute -left-[31px] flex h-4 w-4 items-center justify-center rounded-full border-2 border-primary bg-background">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                </span>
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-sm font-bold text-primary">{item.year}</span>
                  <h3 className="font-semibold">{item.title}</h3>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
              </li>
            ))}
          </ol>
        </Card>
      </section>

      {/* Projetos */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold md:text-2xl">Principais projetos</h2>
          <p className="text-sm text-muted-foreground">
            Iniciativas públicas ligadas à mesma missão.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {PROJECTS.map((p) => (
            <a
              key={p.name}
              href={p.url}
              target="_blank"
              rel="noreferrer"
              className="group"
            >
              <Card className="h-full space-y-2 p-5 transition-colors group-hover:border-primary/50">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{p.name}</h3>
                  <ExternalLink className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                </div>
                <p className="text-xs text-muted-foreground md:text-sm">{p.role}</p>
              </Card>
            </a>
          ))}
        </div>
      </section>

      {/* Redes sociais */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold md:text-2xl">Onde me encontrar</h2>
          <p className="text-sm text-muted-foreground">
            Links oficiais extraídos do meu Media Kit público.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          {SOCIALS.map((s) => (
            <Button
              key={s.label}
              asChild
              variant="outline"
              className="h-auto justify-start gap-3 py-3"
            >
              <a href={s.href} target="_blank" rel="noreferrer">
                <s.icon className="h-4 w-4 text-primary" />
                <span className="truncate">{s.label}</span>
              </a>
            </Button>
          ))}
        </div>
      </section>
    </div>
  );
}
