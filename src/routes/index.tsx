import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ComponentType } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
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
  Play,
  BarChart3,
  ChevronRight,
  ChevronLeft,
  FileText,
  Rocket,
  Shield,
  MessageSquare,
  Mail,
  TrendingUp,
  Users,
  Clock,
  Minus,
  X as XIcon,
  Timer,
  Wifi,
  Smartphone,
  Lock,
  Headphones,
  RefreshCw,
  BookOpen,
  Layers,
  User,
  Gift,
  Wallet,
  PenTool,
  type LucideIcon,
} from "lucide-react";

import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { PLANS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { HowItWorksModal } from "@/components/HowItWorksModal";

const SITE_URL = "https://monzart.com.br";
// Optional: set to an actual YouTube video id when the official demo is ready.
const DEMO_VIDEO_ID: string | null = null;

const FAQ_KEYS = [
  "q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8",
  "q9", "q10", "q11", "q12", "q13", "q14", "q15",
] as const;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BlogAI Pro — Escreva, otimize e publique blogs com IA" },
      {
        name: "description",
        content:
          "Crie artigos otimizados para SEO com IA de ponta e publique no Blogger e WordPress em minutos. Dashboard Google Search Console, monetização integrada e API oficial.",
      },
      {
        name: "keywords",
        content:
          "blog IA, blogger, wordpress, SEO automático, gerador de artigos, google search console, monetização adsense",
      },
      { property: "og:title", content: "BlogAI Pro — A plataforma de blogging com IA" },
      {
        property: "og:description",
        content:
          "Plataforma completa para blogueiros: geração com IA, SEO técnico, publicação automática e monetização.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "BlogAI Pro — A plataforma de blogging com IA" },
      {
        name: "twitter:description",
        content:
          "Geração com IA, SEO técnico automático, publicação em 1 clique e dashboard Search Console.",
      },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": `${SITE_URL}/#organization`,
              name: "BlogAI Pro",
              url: SITE_URL,
              logo: `${SITE_URL}/og-image.jpg`,
              sameAs: [SITE_URL],
              founder: { "@type": "Person", name: "Júnnior Monzart" },
            },
            {
              "@type": "WebSite",
              "@id": `${SITE_URL}/#website`,
              url: SITE_URL,
              name: "BlogAI Pro",
              publisher: { "@id": `${SITE_URL}/#organization` },
              inLanguage: ["pt-BR", "en-US"],
              potentialAction: {
                "@type": "SearchAction",
                target: `${SITE_URL}/?q={search_term_string}`,
                "query-input": "required name=search_term_string",
              },
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  name: "Home",
                  item: `${SITE_URL}/`,
                },
              ],
            },
            {
              "@type": "SoftwareApplication",
              name: "BlogAI Pro",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web, Android",
              description:
                "Plataforma de blogging com IA: gere, otimize, publique e monetize artigos com SEO técnico automático.",
              offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: "4.9",
                reviewCount: "127",
              },
            },
            {
              "@type": "FAQPage",
              mainEntity: [
                { q: "Como funciona o pagamento?", a: "Aceitamos Pix (BRL) via SyncPay e cartão internacional (USD) via Stripe, com processamento oficial e criptografado." },
                { q: "Como funcionam os créditos?", a: "Cada artigo consome créditos. Free: 10/mês. Pro: 150/mês. Premium: ilimitados." },
                { q: "Qual IA é usada?", a: "Modelos generativos de última geração com prompts otimizados e camada de originalidade." },
                { q: "Integram com o Google Search Console?", a: "Sim, com métricas em tempo real de cliques, impressões, CTR e posição por URL." },
                { q: "Como funciona a integração Blogger?", a: "Autorize via OAuth oficial do Google e publique com 1 clique, com suporte a rascunhos e agendamento." },
                { q: "O Stripe é seguro?", a: "Sim. Checkout roda dentro do Stripe (PCI DSS Level 1). Nunca armazenamos dados de cartão." },
                { q: "Como funciona o SyncPay Pix?", a: "Pagamentos em BRL via QR Code Pix, com liberação automática de créditos ao confirmar." },
                { q: "Como vocês protegem meus dados?", a: "RLS no banco, TLS 1.3, JWT, políticas granulares e auditoria completa. LGPD/GDPR." },
                { q: "Posso cancelar quando quiser?", a: "Sim, sem fidelidade. Cancele em 1 clique e mantenha acesso até o fim do ciclo pago." },
                { q: "Quais planos existem?", a: "Free (10 créditos), Pro (150 + publicação + prioridade) e Premium (ilimitados + agendamento + monetização)." },
                { q: "Existe API oficial?", a: "Sim. REST v1 em OpenAPI 3.1, API Key, rate limit por plano e idempotência." },
                { q: "Funciona com WordPress?", a: "Sim. Plugin oficial para WordPress além do Blogger nativo." },
                { q: "Existe app para Android?", a: "Sim. App Android nativo via Capacitor, com a plataforma completa embarcada." },
                { q: "O que acontece com meus dados ao cancelar?", a: "Você pode exportar. Após cancelamento os dados ficam 30 dias antes de remoção, conforme LGPD." },
                { q: "Como funciona o suporte?", a: "E-mail em até 24h para todos. Pro/Premium prioritário; Premium com gerente dedicado." },
              ].map((item) => ({
                "@type": "Question",
                name: item.q,
                acceptedAnswer: { "@type": "Answer", text: item.a },
              })),
            },
          ],
        }),
      },
    ],
  }),
  component: LandingPage,
});

const BENEFIT_ICONS: Record<string, LucideIcon> = {
  ai: Wand2,
  seo: Search,
  publish: Send,
  performance: BarChart3,
  monetization: DollarSign,
  i18n: Globe,
};

const BENEFITS2_ICONS: Record<string, LucideIcon> = {
  time: Timer,
  seo: Search,
  publish: Send,
  ai: Sparkles,
  analytics: BarChart3,
  money: DollarSign,
};

const SOCIAL_PROOF_ICONS: Record<string, LucideIcon> = {
  bloggers: PenTool,
  seo: Search,
  gsc: BarChart3,
  blogger: FileText,
  stripe: Shield,
  syncpay: Zap,
};

const GUARANTEE_ICONS: Record<string, LucideIcon> = {
  secure: Lock,
  updates: RefreshCw,
  support: Headphones,
  noInstall: Check,
  browser: Wifi,
  devices: Smartphone,
};

const SCREENSHOTS = [
  { key: "dashboard", icon: BarChart3 },
  { key: "generator", icon: Wand2 },
  { key: "smart", icon: Sparkles },
  { key: "library", icon: BookOpen },
  { key: "analytics", icon: TrendingUp },
  { key: "finance", icon: Wallet },
  { key: "profile", icon: User },
  { key: "invites", icon: Gift },
] as const;

const STEP_ICONS = [Sparkles, Zap, Rocket];

function LandingPage() {
  const { t } = useTranslation("landing");
  const navigate = useNavigate();
  const { user } = useAuth();
  const [howOpen, setHowOpen] = useState(false);
  const [demoStep, setDemoStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setDemoStep((s) => (s + 1) % 3), 2500);
    return () => clearInterval(id);
  }, []);

  const handleStart = () => navigate({ to: user ? "/dashboard" : "/signup" });

  const benefits = ["ai", "seo", "publish", "performance", "monetization", "i18n"] as const;
  const benefits2 = ["time", "seo", "publish", "ai", "analytics", "money"] as const;
  const socialProof = ["bloggers", "seo", "gsc", "blogger", "stripe", "syncpay"] as const;
  const guarantees = ["secure", "updates", "support", "noInstall", "browser", "devices"] as const;
  const testimonials = ["t1", "t2", "t3", "t4"] as const;

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <HowItWorksModal open={howOpen} onOpenChange={setHowOpen} />
      <FloatingCta onClick={handleStart} label={t("floatingCta")} />

      {/* ==================== NAV ==================== */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
          <BrandLogo />
          <nav
            aria-label="Primary"
            className="hidden items-center gap-8 text-sm font-medium text-muted-foreground lg:flex"
          >
            <a href="#recursos" className="transition-colors hover:text-foreground">
              {t("nav.features")}
            </a>
            <a href="#como-funciona" className="transition-colors hover:text-foreground">
              {t("nav.how")}
            </a>
            <a href="#planos" className="transition-colors hover:text-foreground">
              {t("nav.pricing")}
            </a>
            <a href="#faq" className="transition-colors hover:text-foreground">
              {t("nav.faq")}
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <div className="hidden md:block">
              <LanguageSwitcher />
            </div>
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link to="/login">{t("nav.signIn")}</Link>
            </Button>
            <Button asChild variant="hero" size="sm">
              <Link to="/signup">{t("nav.getStarted")}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* ==================== HERO ==================== */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-glow" aria-hidden />
          <div
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[600px] opacity-40 [background:radial-gradient(60%_60%_at_50%_0%,oklch(0.58_0.24_295/0.35)_0%,transparent_70%)]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,oklch(0.55_0.05_295/0.06)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.55_0.05_295/0.06)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,black,transparent)]"
            aria-hidden
          />

          <div className="mx-auto max-w-7xl px-4 pt-16 pb-12 md:px-6 md:pt-24 md:pb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="mx-auto max-w-3xl text-center"
            >
              <Badge
                variant="secondary"
                className="mb-6 gap-1.5 border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {t("hero.badge")}
              </Badge>
              <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl lg:text-7xl">
                {t("hero.titlePre")}{" "}
                <span className="text-gradient">{t("hero.titleAccent")}</span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
                {t("hero.subtitle")}
              </p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button
                  variant="hero"
                  size="lg"
                  className="w-full sm:w-auto"
                  onClick={handleStart}
                >
                  {t("hero.primaryCta")} <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto"
                  onClick={() => setHowOpen(true)}
                >
                  <Play className="h-4 w-4" /> {t("hero.secondaryCta")}
                </Button>
              </div>
              <div
                className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground"
                aria-label="Avaliação média"
              >
                <div className="flex" aria-hidden>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Star key={i} className="h-4 w-4 fill-warning text-warning" />
                  ))}
                </div>
                <span>{t("hero.microcopy")}</span>
              </div>

              {/* Hero stat cards */}
              <div className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-3 md:grid-cols-4">
                {[
                  { icon: Users, value: "3.2k+", key: "users" },
                  { icon: FileText, value: "127k+", key: "articles" },
                  { icon: Globe, value: "1.8k+", key: "blogs" },
                  { icon: TrendingUp, value: "99.9%", key: "uptime" },
                ].map((s, i) => (
                  <motion.div
                    key={s.key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.4 + i * 0.06 }}
                    className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card/70 px-4 py-3 backdrop-blur"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <s.icon className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-display text-lg font-bold leading-none">
                        {s.value}
                      </div>
                      <div className="mt-1 text-[11px] leading-tight text-muted-foreground">
                        {t(`hero.stats.${s.key}`)}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Animated app mockup */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              className="relative mx-auto mt-16 max-w-5xl"
            >
              <div
                className="absolute -inset-4 rounded-3xl bg-gradient-primary opacity-30 blur-3xl"
                aria-hidden
              />
              <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-elegant">
                <div className="flex items-center gap-2 border-b border-border bg-secondary/40 px-4 py-3">
                  <span className="h-3 w-3 rounded-full bg-destructive/70" aria-hidden />
                  <span className="h-3 w-3 rounded-full bg-warning/70" aria-hidden />
                  <span className="h-3 w-3 rounded-full bg-success/70" aria-hidden />
                  <div className="ml-3 flex-1">
                    <div className="mx-auto flex h-6 w-72 items-center justify-center rounded-md bg-background/60 text-xs text-muted-foreground">
                      app.blogaipro.com/generate
                    </div>
                  </div>
                </div>
                <MockDashboard step={demoStep} t={t} />
              </div>
            </motion.div>

            {/* Trusted-by strip */}
            <div className="mx-auto mt-12 max-w-3xl text-center">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                {t("hero.trustedBy")}
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-muted-foreground/80">
                {["Blogger", "WordPress", "Search Console", "AdSense", "Google AI"].map((n) => (
                  <span key={n} className="font-display text-sm font-bold tracking-tight">
                    {n}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ==================== SOCIAL PROOF ==================== */}
        <section
          aria-label={t("socialProof.title")}
          className="border-y border-border bg-secondary/20"
        >
          <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {socialProof.map((k, i) => {
                const Icon = SOCIAL_PROOF_ICONS[k];
                return (
                  <motion.div
                    key={k}
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: i * 0.04 }}
                    className="flex items-center justify-center gap-2 rounded-xl border border-border/60 bg-card/60 px-3 py-3 text-sm"
                  >
                    <Icon className="h-4 w-4 text-primary" aria-hidden />
                    <span className="font-medium">{t(`socialProof.items.${k}`)}</span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ==================== VIDEO DEMO ==================== */}
        <section className="mx-auto max-w-6xl px-4 py-24 md:px-6">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">
              {t("video.kicker")}
            </span>
            <h2 className="mt-3 font-display text-3xl font-bold md:text-5xl">
              {t("video.title")}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">{t("video.subtitle")}</p>
          </div>
          <VideoEmbed
            videoId={DEMO_VIDEO_ID}
            title={t("video.title")}
            placeholder={t("video.placeholder")}
            watch={t("video.watch")}
            duration={t("video.duration")}
            onFallback={() => setHowOpen(true)}
          />
        </section>

        {/* ==================== SCREENSHOTS CAROUSEL ==================== */}
        <section
          aria-label={t("screenshots.title")}
          className="border-y border-border bg-secondary/20"
        >
          <div className="mx-auto max-w-7xl px-4 py-24 md:px-6">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                {t("screenshots.kicker")}
              </span>
              <h2 className="mt-3 font-display text-3xl font-bold md:text-5xl">
                {t("screenshots.title")}
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">{t("screenshots.subtitle")}</p>
            </div>
            <ScreenshotsCarousel t={t} />
          </div>
        </section>

        {/* ==================== BENEFITS ==================== */}
        <section id="recursos" className="mx-auto max-w-7xl px-4 py-24 md:px-6">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold md:text-5xl">{t("benefits.title")}</h2>
            <p className="mt-4 text-lg text-muted-foreground">{t("benefits.subtitle")}</p>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((key, i) => {
              const Icon = BENEFIT_ICONS[key];
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  className="group relative overflow-hidden rounded-2xl border border-border bg-card p-7 shadow-soft transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-elegant"
                >
                  <div
                    className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/10 blur-2xl transition-opacity group-hover:opacity-100"
                    aria-hidden
                  />
                  <div className="relative">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
                      <Icon className="h-5 w-5" aria-hidden />
                    </div>
                    <h3 className="mt-5 text-lg font-semibold">
                      {t(`benefits.items.${key}.title`)}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {t(`benefits.items.${key}.desc`)}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* ==================== BENEFITS 2 (checkmark cards) ==================== */}
        <section className="border-y border-border bg-secondary/30">
          <div className="mx-auto max-w-7xl px-4 py-24 md:px-6">
            <div className="mx-auto mb-14 max-w-2xl text-center">
              <h2 className="font-display text-3xl font-bold md:text-5xl">
                {t("benefits2.title")}
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">{t("benefits2.subtitle")}</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {benefits2.map((k, i) => {
                const Icon = BENEFITS2_ICONS[k];
                return (
                  <motion.div
                    key={k}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.35, delay: i * 0.05 }}
                    className="flex items-start gap-4 rounded-2xl border border-border bg-card p-6 shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/30"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success">
                      <Check className="h-5 w-5" aria-hidden />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-primary" aria-hidden />
                        <h3 className="text-base font-semibold">
                          {t(`benefits2.items.${k}.title`)}
                        </h3>
                      </div>
                      <p className="mt-1.5 text-sm text-muted-foreground">
                        {t(`benefits2.items.${k}.desc`)}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ==================== HOW ==================== */}
        <section id="como-funciona" className="mx-auto max-w-7xl px-4 py-24 md:px-6">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold md:text-5xl">{t("how.title")}</h2>
            <p className="mt-4 text-lg text-muted-foreground">{t("how.subtitle")}</p>
          </div>
          <div className="relative grid grid-cols-1 gap-8 md:grid-cols-3">
            <div
              className="absolute left-0 right-0 top-8 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent md:block"
              aria-hidden
            />
            {(["s1", "s2", "s3"] as const).map((s, i) => {
              const Icon = STEP_ICONS[i];
              return (
                <motion.div
                  key={s}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="relative flex flex-col items-center text-center"
                >
                  <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/30 bg-background shadow-glow">
                    <Icon className="h-7 w-7 text-primary" aria-hidden />
                  </div>
                  <div className="mt-2 font-display text-xs font-bold uppercase tracking-widest text-primary">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <h3 className="mt-3 text-xl font-semibold">{t(`how.steps.${s}.title`)}</h3>
                  <p className="mt-2 max-w-xs text-muted-foreground">
                    {t(`how.steps.${s}.desc`)}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* ==================== INTEGRATIONS ==================== */}
        <section className="border-y border-border bg-secondary/30">
          <div className="mx-auto max-w-7xl px-4 py-20 md:px-6">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <h2 className="font-display text-3xl font-bold md:text-5xl">
                {t("integrations.title")}
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">{t("integrations.subtitle")}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
              {(
                [
                  { key: "blogger", icon: FileText },
                  { key: "wordpress", icon: Globe },
                  { key: "gsc", icon: Search },
                  { key: "adsense", icon: DollarSign },
                  { key: "analytics", icon: BarChart3 },
                  { key: "stripe", icon: Shield },
                  { key: "openai", icon: Sparkles },
                  { key: "zapier", icon: Zap },
                ] as const
              ).map((it, i) => (
                <motion.div
                  key={it.key}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                  className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card p-4 shadow-soft transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-elegant"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <it.icon className="h-5 w-5" aria-hidden />
                  </div>
                  <span className="text-xs font-medium">{t(`integrations.items.${it.key}`)}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ==================== VERSUS (Manual vs BlogAI Pro) ==================== */}
        <section className="mx-auto max-w-6xl px-4 py-24 md:px-6">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold md:text-5xl">{t("versus.title")}</h2>
            <p className="mt-4 text-lg text-muted-foreground">{t("versus.subtitle")}</p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <VersusCard
              variant="manual"
              title={t("versus.manual.title")}
              time={t("versus.manual.time")}
              badge={t("versus.manual.badge")}
              items={t("versus.manual.items", { returnObjects: true }) as string[]}
            />
            <VersusCard
              variant="pro"
              title={t("versus.pro.title")}
              time={t("versus.pro.time")}
              badge={t("versus.pro.badge")}
              items={t("versus.pro.items", { returnObjects: true }) as string[]}
            />
          </div>
          <div className="mx-auto mt-8 flex max-w-2xl items-center justify-center gap-3 rounded-2xl border border-success/30 bg-success/5 px-6 py-4 text-center">
            <Timer className="h-5 w-5 shrink-0 text-success" aria-hidden />
            <p className="text-sm">
              <span className="font-semibold">{t("versus.savingsLabel")}:</span>{" "}
              <span className="font-semibold text-success">{t("versus.savingsValue")}</span>
            </p>
          </div>
        </section>

        {/* ==================== PRICING ==================== */}
        <section id="planos" className="border-y border-border bg-secondary/30">
          <div className="mx-auto max-w-7xl px-4 py-24 md:px-6">
            <div className="mx-auto mb-16 max-w-2xl text-center">
              <h2 className="font-display text-3xl font-bold md:text-5xl">
                {t("pricing.title")}
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">{t("pricing.subtitle")}</p>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
              {PLANS.filter((p) => p.id !== "teste").map((plan) => (
                <div
                  key={plan.id}
                  className={cn(
                    "relative flex flex-col rounded-2xl border border-border bg-card p-7 shadow-soft transition-all hover:-translate-y-1",
                    plan.highlight && "border-primary shadow-elegant ring-1 ring-primary/40",
                  )}
                >
                  {plan.highlight && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-primary px-3">
                      {t("pricing.popular")}
                    </Badge>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <plan.icon className="h-5 w-5" aria-hidden />
                    </div>
                    <h3 className="text-lg font-bold">{plan.name}</h3>
                  </div>
                  <div className="mt-5 flex items-end gap-1">
                    <span className="font-display text-4xl font-bold">{plan.price}</span>
                    <span className="mb-1.5 text-sm text-muted-foreground">{plan.period}</span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-primary">{plan.credits}</p>
                  <ul className="mt-6 flex-1 space-y-3">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                        <span className="text-muted-foreground">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    asChild
                    variant={plan.highlight ? "hero" : "outline"}
                    className="mt-7 w-full"
                  >
                    <Link to="/signup">
                      {plan.id === "free" ? t("pricing.ctaFree") : t("pricing.cta")}
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ==================== COMPARISON TABLE ==================== */}
        <section className="mx-auto max-w-6xl px-4 py-24 md:px-6">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold md:text-5xl">{t("compare.title")}</h2>
            <p className="mt-4 text-lg text-muted-foreground">{t("compare.subtitle")}</p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40">
                  <tr>
                    <th scope="col" className="px-5 py-4 text-left font-semibold">
                      {t("compare.feature")}
                    </th>
                    <th scope="col" className="px-5 py-4 text-center font-semibold">
                      Free
                    </th>
                    <th scope="col" className="px-5 py-4 text-center font-semibold text-primary">
                      Pro
                    </th>
                    <th scope="col" className="px-5 py-4 text-center font-semibold">
                      Premium
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    { k: "credits", v: ["10", "150", "∞"] },
                    { k: "seo", v: [true, true, true] },
                    { k: "publish", v: [false, true, true] },
                    { k: "images", v: [false, true, true] },
                    { k: "clusters", v: [false, true, true] },
                    { k: "scheduler", v: [false, false, true] },
                    { k: "monetization", v: [false, false, true] },
                    {
                      k: "support",
                      v: [
                        t("compare.values.supportFree"),
                        t("compare.values.supportPro"),
                        t("compare.values.supportPremium"),
                      ],
                    },
                    { k: "api", v: [false, true, true] },
                  ].map((row) => (
                    <tr key={row.k} className="transition-colors hover:bg-secondary/20">
                      <th scope="row" className="px-5 py-3.5 text-left font-medium">
                        {t(`compare.rows.${row.k}`)}
                      </th>
                      {row.v.map((val, i) => (
                        <td key={i} className="px-5 py-3.5 text-center">
                          {typeof val === "boolean" ? (
                            val ? (
                              <Check
                                className="mx-auto h-4 w-4 text-success"
                                aria-label="Incluído"
                              />
                            ) : (
                              <Minus
                                className="mx-auto h-4 w-4 text-muted-foreground/50"
                                aria-label="Não incluído"
                              />
                            )
                          ) : (
                            <span className={cn(i === 1 && "font-semibold text-primary")}>
                              {val}
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ==================== TESTIMONIALS ==================== */}
        <section className="border-y border-border bg-secondary/30">
          <div className="mx-auto max-w-7xl px-4 py-24 md:px-6">
            <div className="mx-auto mb-14 max-w-2xl text-center">
              <h2 className="font-display text-3xl font-bold md:text-5xl">
                {t("testimonials.title")}
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">{t("testimonials.subtitle")}</p>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
              {testimonials.map((tk, i) => (
                <motion.figure
                  key={tk}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  className="relative flex h-full flex-col rounded-2xl border border-border bg-card p-6 shadow-soft"
                >
                  <div className="mb-3 flex" aria-hidden>
                    {[0, 1, 2, 3, 4].map((s) => (
                      <Star key={s} className="h-4 w-4 fill-warning text-warning" />
                    ))}
                  </div>
                  <blockquote className="flex-1 text-sm leading-relaxed text-foreground/90">
                    &ldquo;{t(`testimonials.items.${tk}.quote`)}&rdquo;
                  </blockquote>
                  <figcaption className="mt-5 flex items-center gap-3 border-t border-border pt-4">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary font-semibold text-primary-foreground"
                      aria-hidden
                    >
                      {t(`testimonials.items.${tk}.author`).charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-semibold">
                        {t(`testimonials.items.${tk}.author`)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t(`testimonials.items.${tk}.role`)}
                      </div>
                    </div>
                  </figcaption>
                </motion.figure>
              ))}
            </div>
          </div>
        </section>

        {/* ==================== GUARANTEES ==================== */}
        <section className="mx-auto max-w-7xl px-4 py-24 md:px-6">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold md:text-5xl">
              {t("guarantees.title")}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">{t("guarantees.subtitle")}</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {guarantees.map((k, i) => {
              const Icon = GUARANTEE_ICONS[k];
              return (
                <motion.div
                  key={k}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.35, delay: i * 0.05 }}
                  className="flex items-start gap-4 rounded-2xl border border-border bg-card p-6 shadow-soft transition-all hover:-translate-y-0.5"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold">
                      {t(`guarantees.items.${k}.title`)}
                    </h3>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      {t(`guarantees.items.${k}.desc`)}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* ==================== FAQ ==================== */}
        <section id="faq" className="border-y border-border bg-secondary/30">
          <div className="mx-auto max-w-4xl px-4 py-24 md:px-6">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <h2 className="font-display text-3xl font-bold md:text-5xl">{t("faq.title")}</h2>
              <p className="mt-4 text-lg text-muted-foreground">{t("faq.subtitle")}</p>
            </div>
            <Accordion type="single" collapsible className="w-full">
              {FAQ_KEYS.map((q) => (
                <AccordionItem key={q} value={q} className="border-border">
                  <AccordionTrigger className="text-left text-base font-semibold hover:no-underline">
                    {t(`faq.items.${q}.q`)}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {t(`faq.items.${q}.a`)}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* ==================== NEWSLETTER ==================== */}
        <section className="mx-auto max-w-4xl px-4 py-20 md:px-6">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-elegant md:p-12">
            <div
              className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/20 blur-3xl"
              aria-hidden
            />
            <div className="relative grid gap-8 md:grid-cols-2 md:items-center">
              <div>
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Mail className="h-5 w-5" aria-hidden />
                </div>
                <h2 className="font-display text-2xl font-bold md:text-3xl">
                  {t("newsletter.title")}
                </h2>
                <p className="mt-2 text-muted-foreground">{t("newsletter.subtitle")}</p>
              </div>
              <NewsletterForm t={t} />
            </div>
          </div>
        </section>

        {/* ==================== FINAL CTA ==================== */}
        <section className="mx-auto max-w-7xl px-4 py-24 md:px-6">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-hero px-6 py-20 text-center shadow-elegant md:px-12">
            <div className="absolute inset-0 bg-gradient-glow" aria-hidden />
            <div
              className="pointer-events-none absolute inset-0 [background:radial-gradient(60%_60%_at_50%_100%,oklch(0.68_0.21_300/0.35)_0%,transparent_70%)]"
              aria-hidden
            />
            <div className="relative">
              <h2 className="mx-auto max-w-2xl font-display text-3xl font-bold text-sidebar-foreground md:text-5xl">
                {t("finalCta.title")}
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sidebar-foreground/70 md:text-lg">
                {t("finalCta.subtitle")}
              </p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button asChild variant="hero" size="lg">
                  <Link to="/signup">
                    {t("finalCta.primary")} <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-sidebar-foreground/20 bg-transparent text-sidebar-foreground hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground"
                >
                  <Link to="/criador">
                    <MessageSquare className="h-4 w-4" /> {t("finalCta.secondary")}
                  </Link>
                </Button>
              </div>
              <div className="mt-6 flex flex-col items-center justify-center gap-x-6 gap-y-1 text-sm text-sidebar-foreground/70 sm:flex-row">
                <span className="inline-flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-success" aria-hidden />
                  {t("finalCta.microcopy1")}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-success" aria-hidden />
                  {t("finalCta.microcopy2")}
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ==================== FOOTER ==================== */}
      <footer className="border-t border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
          <div className="grid grid-cols-2 gap-10 md:grid-cols-5">
            <div className="col-span-2">
              <BrandLogo />
              <p className="mt-4 max-w-xs text-sm text-muted-foreground">
                {t("footer.tagline")}
              </p>
              <div className="mt-6">
                <LanguageSwitcher />
              </div>
            </div>
            <FooterCol
              title={t("footer.product")}
              links={[
                { label: t("footer.links.features"), href: "#recursos" },
                { label: t("footer.links.pricing"), href: "#planos" },
                { label: t("footer.links.changelog"), href: "/atualizacoes" },
              ]}
            />
            <FooterCol
              title={t("footer.resources")}
              links={[
                { label: t("footer.links.help"), href: "/ajuda" },
                { label: t("footer.links.api"), href: "/api/v1/openapi.json" },
                {
                  label: t("footer.links.blog"),
                  href: "https://monzart.com.br",
                  external: true,
                },
              ]}
            />
            <FooterCol
              title={t("footer.company")}
              links={[
                { label: t("footer.links.creator"), href: "/criador" },
                { label: t("footer.links.contact"), href: "/feedback" },
              ]}
            />
          </div>
          <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border pt-8 md:flex-row">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} BlogAI Pro. {t("footer.rights")}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5" aria-hidden />
              <span>LGPD &amp; GDPR compliant</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ---------- Footer Column ---------- */
function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string; external?: boolean }[];
}) {
  return (
    <div>
      <h4 className="text-sm font-semibold">{title}</h4>
      <ul className="mt-4 space-y-2">
        {links.map((l) => (
          <li key={l.label}>
            <a
              href={l.href}
              {...(l.external ? { rel: "noopener noreferrer", target: "_blank" } : {})}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- Video Embed (YouTube-ready) ---------- */
function VideoEmbed({
  videoId,
  title,
  placeholder,
  watch,
  duration,
  onFallback,
}: {
  videoId: string | null;
  title: string;
  placeholder: string;
  watch: string;
  duration: string;
  onFallback: () => void;
}) {
  const [playing, setPlaying] = useState(false);

  if (videoId && playing) {
    return (
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-elegant">
        <div className="relative aspect-video w-full">
          <iframe
            className="absolute inset-0 h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
            title={title}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={() => (videoId ? setPlaying(true) : onFallback())}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="group relative block w-full overflow-hidden rounded-3xl border border-border bg-card shadow-elegant"
      aria-label={watch}
    >
      <div
        className="absolute -inset-4 rounded-3xl bg-gradient-primary opacity-20 blur-3xl transition-opacity group-hover:opacity-40"
        aria-hidden
      />
      <div className="relative aspect-video w-full bg-gradient-hero">
        {videoId ? (
          <img
            src={`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`}
            alt={title}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover opacity-90"
          />
        ) : null}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow ring-8 ring-primary/20 transition-transform group-hover:scale-110">
              <Play className="ml-1 h-8 w-8 fill-current" aria-hidden />
            </div>
            <p className="max-w-xs text-center text-sm text-sidebar-foreground/80">
              {videoId ? watch : placeholder}
            </p>
            <span className="inline-flex items-center gap-1 rounded-full border border-sidebar-foreground/20 bg-background/40 px-3 py-1 text-xs text-sidebar-foreground/80">
              <Clock className="h-3 w-3" aria-hidden /> {duration}
            </span>
          </div>
        </div>
      </div>
    </motion.button>
  );
}

/* ---------- Screenshots Carousel ---------- */
function ScreenshotsCarousel({ t }: { t: (k: string) => string }) {
  const [idx, setIdx] = useState(0);
  const total = SCREENSHOTS.length;
  const item = SCREENSHOTS[idx];
  const Icon = item.icon;

  const go = (dir: 1 | -1) => setIdx((i) => (i + dir + total) % total);

  return (
    <div className="relative">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-elegant">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={item.key}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.35 }}
            className="grid gap-6 p-6 md:grid-cols-[1.2fr_1fr] md:p-10"
          >
            {/* Visual */}
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-border bg-gradient-hero">
              <div className="absolute inset-0 bg-gradient-glow" aria-hidden />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-primary/15 text-primary shadow-glow ring-8 ring-primary/10">
                  <Icon className="h-11 w-11" aria-hidden />
                </div>
              </div>
              <div className="absolute inset-x-6 bottom-6 space-y-2">
                <div className="h-3 w-24 rounded bg-sidebar-foreground/30" />
                <div className="h-2 w-full rounded bg-sidebar-foreground/15" />
                <div className="h-2 w-10/12 rounded bg-sidebar-foreground/15" />
              </div>
            </div>

            {/* Caption */}
            <div className="flex flex-col justify-center">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                {String(idx + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
              </span>
              <h3 className="mt-3 font-display text-2xl font-bold md:text-3xl">
                {t(`screenshots.items.${item.key}.title`)}
              </h3>
              <p className="mt-3 text-muted-foreground">
                {t(`screenshots.items.${item.key}.desc`)}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Nav buttons */}
        <div className="absolute inset-y-0 left-2 flex items-center">
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label={t("screenshots.prev")}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/90 text-foreground shadow-soft transition-all hover:scale-105"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="absolute inset-y-0 right-2 flex items-center">
          <button
            type="button"
            onClick={() => go(1)}
            aria-label={t("screenshots.next")}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/90 text-foreground shadow-soft transition-all hover:scale-105"
          >
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </div>

      {/* Dots */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {SCREENSHOTS.map((s, i) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setIdx(i)}
            aria-label={t(`screenshots.items.${s.key}.title`)}
            aria-current={i === idx}
            className={cn(
              "h-2 rounded-full transition-all",
              i === idx ? "w-8 bg-primary" : "w-2 bg-border hover:bg-primary/40",
            )}
          />
        ))}
      </div>
    </div>
  );
}

/* ---------- Versus Card ---------- */
function VersusCard({
  variant,
  title,
  time,
  badge,
  items,
}: {
  variant: "manual" | "pro";
  title: string;
  time: string;
  badge: string;
  items: string[];
}) {
  const isPro = variant === "pro";
  const RowIcon: ComponentType<{ className?: string; "aria-hidden"?: boolean }> = isPro
    ? Check
    : XIcon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className={cn(
        "relative flex flex-col overflow-hidden rounded-2xl border p-7 shadow-soft transition-all",
        isPro
          ? "border-primary bg-card shadow-elegant ring-1 ring-primary/40"
          : "border-border bg-card",
      )}
    >
      {isPro && (
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/20 blur-3xl"
          aria-hidden
        />
      )}
      <div className="relative">
        <div className="flex items-center justify-between gap-2">
          <Badge
            variant="secondary"
            className={cn(
              "px-2.5",
              isPro
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-border bg-secondary text-muted-foreground",
            )}
          >
            {badge}
          </Badge>
          <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
            <Timer className="h-3.5 w-3.5" aria-hidden />
            {time}
          </div>
        </div>
        <h3 className="mt-4 font-display text-2xl font-bold">{title}</h3>
        <ul className="mt-5 space-y-3">
          {items.map((it) => (
            <li key={it} className="flex items-start gap-3 text-sm">
              <span
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                  isPro
                    ? "bg-success/15 text-success"
                    : "bg-destructive/10 text-destructive",
                )}
              >
                <RowIcon className="h-3 w-3" aria-hidden />
              </span>
              <span
                className={cn(
                  "leading-relaxed",
                  isPro ? "text-foreground/90" : "text-muted-foreground line-through opacity-70",
                )}
              >
                {it}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

/* ---------- Animated dashboard preview ---------- */
function MockDashboard({
  step,
  t,
}: {
  step: number;
  t: (k: string) => string;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-[220px_1fr]">
      <aside className="hidden rounded-xl bg-secondary/60 p-4 md:block" aria-hidden>
        <div className="mb-4 h-3 w-16 rounded bg-muted-foreground/20" />
        <div className="space-y-2">
          {[FileText, Wand2, BarChart3, Send].map((I, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-xs",
                i === 1 ? "bg-primary/15 text-primary" : "text-muted-foreground",
              )}
            >
              <I className="h-3.5 w-3.5" />
              <span className="h-2 w-16 rounded bg-current opacity-40" />
            </div>
          ))}
        </div>
      </aside>

      <div className="flex min-h-[280px] flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            {t("demo.kicker")}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(["s1", "s2", "s3"] as const).map((s, i) => (
            <div
              key={s}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                step === i
                  ? "border-primary bg-primary/10 text-primary shadow-glow"
                  : "border-border bg-background text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold",
                  step === i ? "bg-primary text-primary-foreground" : "bg-muted",
                )}
              >
                {i + 1}
              </span>
              {t(`demo.steps.${s}`)}
            </div>
          ))}
        </div>

        <motion.div
          key={step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mt-2 flex-1 rounded-xl border border-border bg-background/60 p-5"
        >
          {step === 0 && (
            <div className="space-y-3">
              <div className="h-3 w-24 rounded bg-primary/40" />
              <div className="h-4 w-56 rounded bg-muted-foreground/25" />
              <div className="mt-4 h-9 w-full rounded-md border border-border bg-secondary/40" />
              <div className="grid grid-cols-3 gap-2">
                <div className="h-8 rounded-md bg-secondary/40" />
                <div className="h-8 rounded-md bg-secondary/40" />
                <div className="h-8 rounded-md bg-secondary/40" />
              </div>
            </div>
          )}
          {step === 1 && (
            <div className="space-y-2">
              <div className="h-3 w-32 rounded bg-primary/40" />
              <div className="h-3 w-full rounded bg-muted-foreground/15" />
              <div className="h-3 w-11/12 rounded bg-muted-foreground/15" />
              <div className="h-3 w-4/5 rounded bg-muted-foreground/15" />
              <div className="h-3 w-full rounded bg-muted-foreground/15" />
              <div className="h-3 w-2/3 rounded bg-muted-foreground/15" />
              <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-1 text-[10px] font-semibold text-success">
                <Check className="h-3 w-3" /> SEO Score 96
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
                <Send className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="h-3 w-40 rounded bg-muted-foreground/25" />
              <div className="inline-flex items-center gap-1 rounded-full bg-success/15 px-3 py-1 text-xs font-semibold text-success">
                <Check className="h-3.5 w-3.5" /> Publicado
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

/* ---------- Newsletter form ---------- */
function NewsletterForm({ t }: { t: (k: string) => string }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    setSent(true);
    setEmail("");
  };

  if (sent) {
    return (
      <div
        className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/5 px-4 py-4 text-sm text-success"
        role="status"
        aria-live="polite"
      >
        <Check className="h-5 w-5 shrink-0" aria-hidden />
        <span>{t("newsletter.success")}</span>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="newsletter-email" className="sr-only">
          {t("newsletter.placeholder")}
        </label>
        <input
          id="newsletter-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("newsletter.placeholder")}
          autoComplete="email"
          className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <Button type="submit" variant="hero" size="lg" className="shrink-0">
          {t("newsletter.cta")} <ArrowRight className="h-4 w-4" aria-hidden />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{t("newsletter.microcopy")}</p>
    </form>
  );
}

/* ---------- Floating CTA ---------- */
function FloatingCta({ onClick, label }: { onClick: () => void; label: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-gradient-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-elegant ring-1 ring-primary/40 transition-all duration-300 hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 md:bottom-8 md:right-8",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
      )}
    >
      <Rocket className="h-4 w-4" aria-hidden />
      {label}
    </button>
  );
}

// Suppress unused-import lints for future toolbelt (icons available but not required now)
void Layers;
