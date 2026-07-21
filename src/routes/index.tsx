import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
  Play,
  BarChart3,
  ChevronRight,
  FileText,
  Rocket,
  Shield,
  MessageSquare,
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

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BlogAI Pro — A plataforma de blogging com IA para criadores sérios" },
      {
        name: "description",
        content:
          "Escreva, otimize e publique artigos otimizados para SEO no Blogger e WordPress em minutos. IA de ponta, dashboard de desempenho e monetização integrada.",
      },
      {
        property: "og:title",
        content: "BlogAI Pro — Blogging com IA em escala profissional",
      },
      {
        property: "og:description",
        content:
          "Plataforma completa para blogueiros: geração com IA, SEO técnico, publicação automática e monetização.",
      },
      { property: "og:url", content: "https://monzart.com.br/" },
    ],
    links: [{ rel: "canonical", href: "https://monzart.com.br/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "SoftwareApplication",
              name: "BlogAI Pro",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              description:
                "Plataforma de blogging com IA: gere, otimize, publique e monetize artigos.",
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
                {
                  "@type": "Question",
                  name: "Preciso de cartão de crédito para começar?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Não. Você ganha 10 créditos ao se cadastrar e pode testar as funcionalidades principais sem custo.",
                  },
                },
                {
                  "@type": "Question",
                  name: "O conteúdo gerado é original?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Sim. Os artigos são gerados com IA de última geração e passam por checagens de originalidade.",
                  },
                },
                {
                  "@type": "Question",
                  name: "Funciona com WordPress ou só Blogger?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Funciona com os dois. Temos integração nativa com Blogger e um plugin oficial para WordPress.",
                  },
                },
              ],
            },
          ],
        }),
      },
      // TODO: Substituir GA_MEASUREMENT_ID pelo ID real (G-XXXXXXXXXX)
      // {
      //   async: true,
      //   src: "https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID",
      // },
      // {
      //   children: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','GA_MEASUREMENT_ID');`,
      // },
      // TODO: Google Tag Manager — substituir GTM-XXXXXXX
      // {
      //   children: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-XXXXXXX');`,
      // },
    ],
  }),
  component: LandingPage,
});

const BENEFIT_ICONS = {
  ai: Wand2,
  seo: Search,
  publish: Send,
  performance: BarChart3,
  monetization: DollarSign,
  i18n: Globe,
} as const;

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
  const testimonials = ["t1", "t2", "t3", "t4"] as const;
  const faqs = ["q1", "q2", "q3", "q4", "q5", "q6"] as const;

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <HowItWorksModal open={howOpen} onOpenChange={setHowOpen} />

      {/* ==================== NAV ==================== */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
          <BrandLogo />
          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground lg:flex">
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

      {/* ==================== HERO ==================== */}
      <section className="relative overflow-hidden">
        {/* Backgrounds */}
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
              <Button variant="hero" size="lg" className="w-full sm:w-auto" onClick={handleStart}>
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
            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-warning text-warning" />
                ))}
              </div>
              <span>{t("hero.microcopy")}</span>
            </div>
          </motion.div>

          {/* Animated app mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="relative mx-auto mt-16 max-w-5xl"
          >
            <div className="absolute -inset-4 rounded-3xl bg-gradient-primary opacity-30 blur-3xl" aria-hidden />
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-elegant">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 border-b border-border bg-secondary/40 px-4 py-3">
                <span className="h-3 w-3 rounded-full bg-destructive/70" />
                <span className="h-3 w-3 rounded-full bg-warning/70" />
                <span className="h-3 w-3 rounded-full bg-success/70" />
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
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 opacity-60">
              {["Blogger", "WordPress", "Search Console", "AdSense", "Google AI"].map((n) => (
                <span key={n} className="font-display text-sm font-bold tracking-tight">
                  {n}
                </span>
              ))}
            </div>
          </div>
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
                <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/10 blur-2xl transition-opacity group-hover:opacity-100" />
                <div className="relative">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
                    <Icon className="h-5 w-5" />
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

      {/* ==================== HOW ==================== */}
      <section id="como-funciona" className="border-y border-border bg-secondary/30">
        <div className="mx-auto max-w-7xl px-4 py-24 md:px-6">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold md:text-5xl">{t("how.title")}</h2>
            <p className="mt-4 text-lg text-muted-foreground">{t("how.subtitle")}</p>
          </div>
          <div className="relative grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="absolute left-0 right-0 top-8 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent md:block" />
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
                    <Icon className="h-7 w-7 text-primary" />
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
        </div>
      </section>

      {/* ==================== SHOWCASE ==================== */}
      <section className="mx-auto max-w-7xl px-4 py-24 md:px-6">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold md:text-5xl">{t("showcase.title")}</h2>
          <p className="mt-4 text-lg text-muted-foreground">{t("showcase.subtitle")}</p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {(["dashboard", "editor", "performance"] as const).map((s, i) => (
            <motion.div
              key={s}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-1 shadow-soft transition-all hover:shadow-elegant"
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-gradient-hero">
                <MockScreen variant={s} />
              </div>
              <div className="flex items-center justify-between px-3 py-3">
                <span className="text-sm font-semibold">{t(`showcase.captions.${s}`)}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ==================== PRICING ==================== */}
      <section id="planos" className="border-y border-border bg-secondary/30">
        <div className="mx-auto max-w-7xl px-4 py-24 md:px-6">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold md:text-5xl">{t("pricing.title")}</h2>
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
                    <plan.icon className="h-5 w-5" />
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
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
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

      {/* ==================== TESTIMONIALS ==================== */}
      <section className="mx-auto max-w-7xl px-4 py-24 md:px-6">
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
              <div className="mb-3 flex">
                {[...Array(5)].map((_, s) => (
                  <Star key={s} className="h-4 w-4 fill-warning text-warning" />
                ))}
              </div>
              <blockquote className="flex-1 text-sm leading-relaxed text-foreground/90">
                “{t(`testimonials.items.${tk}.quote`)}”
              </blockquote>
              <figcaption className="mt-5 flex items-center gap-3 border-t border-border pt-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary font-semibold text-primary-foreground">
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
      </section>

      {/* ==================== FAQ ==================== */}
      <section id="faq" className="border-y border-border bg-secondary/30">
        <div className="mx-auto max-w-4xl px-4 py-24 md:px-6">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold md:text-5xl">{t("faq.title")}</h2>
            <p className="mt-4 text-lg text-muted-foreground">{t("faq.subtitle")}</p>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((q) => (
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
                <Link to="/signup">
                  <MessageSquare className="h-4 w-4" /> {t("finalCta.secondary")}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== FOOTER ==================== */}
      <footer className="border-t border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
          <div className="grid grid-cols-2 gap-10 md:grid-cols-5">
            <div className="col-span-2">
              <BrandLogo />
              <p className="mt-4 max-w-xs text-sm text-muted-foreground">{t("footer.tagline")}</p>
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
                { label: t("footer.links.blog"), href: "https://monzart.com.br", external: true },
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
              <Shield className="h-3.5 w-3.5" />
              <span>LGPD & GDPR compliant</span>
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
            {l.external ? (
              <a
                href={l.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {l.label}
              </a>
            ) : (
              <a
                href={l.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {l.label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
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
      {/* Sidebar */}
      <aside className="hidden rounded-xl bg-secondary/60 p-4 md:block">
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

      {/* Main pane */}
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

        {/* Fake content preview */}
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

/* ---------- Screenshot-style mock ---------- */
function MockScreen({ variant }: { variant: "dashboard" | "editor" | "performance" }) {
  if (variant === "dashboard") {
    return (
      <div className="flex h-full flex-col gap-2 p-4">
        <div className="h-3 w-20 rounded bg-primary/40" />
        <div className="grid flex-1 grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-lg bg-sidebar-foreground/10 p-2"
            >
              <div className="h-2 w-10 rounded bg-sidebar-foreground/20" />
              <div className="mt-2 h-4 w-14 rounded bg-sidebar-foreground/40" />
            </div>
          ))}
        </div>
        <div className="rounded-lg bg-sidebar-foreground/10 p-2">
          <div className="flex items-end gap-1">
            {[30, 50, 40, 70, 60, 90, 80].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-gradient-primary"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }
  if (variant === "editor") {
    return (
      <div className="flex h-full flex-col gap-2 p-4">
        <div className="h-4 w-3/4 rounded bg-sidebar-foreground/30" />
        <div className="mt-1 space-y-2">
          <div className="h-2 w-full rounded bg-sidebar-foreground/15" />
          <div className="h-2 w-11/12 rounded bg-sidebar-foreground/15" />
          <div className="h-2 w-10/12 rounded bg-sidebar-foreground/15" />
          <div className="h-2 w-full rounded bg-sidebar-foreground/15" />
          <div className="h-2 w-9/12 rounded bg-sidebar-foreground/15" />
        </div>
        <div className="mt-auto flex gap-2">
          <div className="h-6 flex-1 rounded bg-primary/40" />
          <div className="h-6 w-16 rounded bg-sidebar-foreground/20" />
        </div>
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col gap-2 p-4">
      <div className="flex items-center justify-between">
        <div className="h-3 w-16 rounded bg-primary/40" />
        <div className="h-3 w-10 rounded bg-sidebar-foreground/20" />
      </div>
      <div className="relative flex-1 rounded-lg bg-sidebar-foreground/10 p-3">
        <svg viewBox="0 0 100 40" className="h-full w-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="lg" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.68 0.21 300)" stopOpacity="0.6" />
              <stop offset="100%" stopColor="oklch(0.68 0.21 300)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0,30 C15,25 25,10 40,15 C55,20 65,5 80,8 C90,10 95,4 100,6 L100,40 L0,40 Z"
            fill="url(#lg)"
          />
          <path
            d="M0,30 C15,25 25,10 40,15 C55,20 65,5 80,8 C90,10 95,4 100,6"
            fill="none"
            stroke="oklch(0.68 0.21 300)"
            strokeWidth="1"
          />
        </svg>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded bg-sidebar-foreground/10 p-1.5">
            <div className="h-1.5 w-6 rounded bg-sidebar-foreground/30" />
            <div className="mt-1 h-2 w-10 rounded bg-sidebar-foreground/50" />
          </div>
        ))}
      </div>
    </div>
  );
}
