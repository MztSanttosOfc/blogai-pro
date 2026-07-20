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
  Download,
} from "lucide-react";
const SiPinterest = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
    <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.223.083.345-.09.377-.293 1.194-.333 1.361-.053.22-.174.267-.402.161-1.499-.699-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
  </svg>
);
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import creatorPortrait from "@/assets/creator-portrait.png";

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

const PROJECTS: Array<{
  name: string;
  role: string;
  url?: string;
  download?: string;
  cta?: string;
}> = [
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
    name: "DivPen",
    role: "Editor online para HTML, CSS e JavaScript — criação e testes rápidos de código.",
    url: "https://divpen.monzart.com.br/",
  },
  {
    name: "Ferramentas Gratuitas",
    role: "Coleção de ferramentas gratuitas para blogueiros, criadores de conteúdo e profissionais de SEO.",
    url: "https://blog.monzart.com.br/p/28-ferramentas-gratuitas-para.html",
  },
  {
    name: "Plugin Oficial do BlogAI Pro",
    role: "Integração oficial WordPress ↔ BlogAI Pro para publicação automatizada.",
    download: "/blogai-pro-plugin.zip",
    cta: "Baixar Plugin",
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
  {
    label: "Instagram",
    href: "https://www.instagram.com/mzt.santtos.ofc",
    icon: Instagram,
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/@Mzt_Santtos_ofc",
    icon: Youtube,
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/jr.mzt.santtos",
    icon: Facebook,
  },
  {
    label: "Pinterest",
    href: "https://www.pinterest.com/MztSanttosOfc",
    icon: SiPinterest,
  },
];

function CreatorPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-12 animate-fade-in">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-hero p-6 md:p-10">
        <div className="absolute inset-0 bg-gradient-glow opacity-70" aria-hidden />
        <div className="relative grid gap-8 md:grid-cols-[auto_minmax(0,1fr)] md:items-center">
          <div className="mx-auto md:mx-0">
            <div className="relative animate-scale-in">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-primary to-primary/40 blur-lg opacity-70" aria-hidden />
              <img
                src={creatorPortrait}
                alt="Foto oficial de Monzart Santtos, criador do BlogAI Pro"
                loading="lazy"
                decoding="async"
                width={1135}
                height={1136}
                className="relative h-40 w-40 rounded-full object-cover shadow-2xl ring-4 ring-primary/40 md:h-56 md:w-56"
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
                <a href="https://blog.monzart.com.br" target="_blank" rel="noreferrer">
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
          {PROJECTS.map((p) => {
            if (p.download) {
              return (
                <Card key={p.name} className="flex h-full flex-col justify-between gap-3 p-5">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{p.name}</h3>
                      <Download className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-xs text-muted-foreground md:text-sm">{p.role}</p>
                  </div>
                  <Button asChild variant="hero" size="sm" className="w-full">
                    <a href={p.download} download>
                      <Download className="h-4 w-4" /> 📥 {p.cta ?? "Baixar"}
                    </a>
                  </Button>
                </Card>
              );
            }
            return (
              <a key={p.name} href={p.url} target="_blank" rel="noreferrer" className="group">
                <Card className="h-full space-y-2 p-5 transition-colors group-hover:border-primary/50">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{p.name}</h3>
                    <ExternalLink className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground md:text-sm">{p.role}</p>
                </Card>
              </a>
            );
          })}
        </div>
      </section>

      {/* Redes sociais */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold md:text-2xl">Onde me encontrar</h2>
          <p className="text-sm text-muted-foreground">
            Links oficiais das minhas redes e canais.
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
