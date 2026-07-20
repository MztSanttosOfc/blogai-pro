import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
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
import i18n from "@/i18n";

export const Route = createFileRoute("/_authenticated/criador")({
  head: () => ({
    meta: [
      { title: i18n.t("pageTitle", { ns: "creator" }) },
      {
        name: "description",
        content: i18n.t("metaDescription", { ns: "creator" }),
      },
      { property: "og:title", content: i18n.t("pageTitle", { ns: "creator" }) },
      {
        property: "og:description",
        content: i18n.t("ogDescription", { ns: "creator" }),
      },
    ],
  }),
  component: CreatorPage,
});

const TIMELINE_YEARS = ["2017", "2019", "2021", "2023", "2025", "2026"] as const;

function CreatorPage() {
  const { t } = useTranslation("creator");

  const stats = [
    { key: "years", value: "8+", icon: Calendar },
    { key: "projects", value: "40+", icon: Rocket },
    { key: "tools", value: "12", icon: Code2 },
    { key: "impacted", value: "1k+", icon: Users },
  ] as const;

  const expertise = [
    { icon: FileText, key: "blogger" as const },
    { icon: TrendingUp, key: "seo" as const },
    { icon: Award, key: "monetization" as const },
    { icon: Code2, key: "dev" as const },
  ];

  const projects: Array<{
    name: string;
    roleKey: string;
    url?: string;
    download?: string;
    ctaKey?: string;
  }> = [
    { name: "BlogAI Pro", roleKey: "blogaiPro", url: "https://monzart.com.br" },
    { name: "Blog Monzart", roleKey: "blog", url: "https://blog.monzart.com.br" },
    { name: "DivPen", roleKey: "divpen", url: "https://divpen.monzart.com.br/" },
    {
      name: "Ferramentas Gratuitas",
      roleKey: "tools",
      url: "https://blog.monzart.com.br/p/28-ferramentas-gratuitas-para.html",
    },
    {
      name: "Plugin Oficial do BlogAI Pro",
      roleKey: "plugin",
      download: "/blogai-pro-plugin.zip",
      ctaKey: "pluginCta",
    },
  ];

  const socials = [
    { labelKey: "site", href: "https://monzart.com.br", icon: Globe },
    { labelKey: "blog", href: "https://blog.monzart.com.br", icon: FileText },
    {
      labelKey: "mediaKit",
      href: "https://blog.monzart.com.br/p/media-kit-monzart-santtos.html",
      icon: ExternalLink,
    },
    {
      labelKey: "contact",
      href: "https://blog.monzart.com.br/p/contato_01435481532.html",
      icon: Mail,
    },
    { label: "Instagram", href: "https://www.instagram.com/mzt.santtos.ofc", icon: Instagram },
    { label: "YouTube", href: "https://www.youtube.com/@Mzt_Santtos_ofc", icon: Youtube },
    { label: "Facebook", href: "https://www.facebook.com/jr.mzt.santtos", icon: Facebook },
    { label: "Pinterest", href: "https://www.pinterest.com/MztSanttosOfc", icon: SiPinterest },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-12 animate-fade-in">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-hero p-6 md:p-10">
        <div className="absolute inset-0 bg-gradient-glow opacity-70" aria-hidden />
        <div className="relative grid gap-8 md:grid-cols-[auto_minmax(0,1fr)] md:items-center">
          <div className="mx-auto md:mx-0">
            <div className="relative animate-scale-in">
              <div
                className="absolute -inset-1 rounded-full bg-gradient-to-br from-primary to-primary/40 blur-lg opacity-70"
                aria-hidden
              />
              <img
                src={creatorPortrait}
                alt={t("hero.portraitAlt")}
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
              <Sparkles className="mr-1 h-3 w-3" /> {t("hero.badge")}
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight text-white md:text-5xl">
              {t("hero.name")}
            </h1>
            <p className="text-base text-white/80 md:text-lg">{t("hero.description")}</p>
            <div className="flex flex-wrap justify-center gap-2 md:justify-start">
              <Button asChild variant="hero" size="lg">
                <a href="https://blog.monzart.com.br" target="_blank" rel="noreferrer">
                  <Globe className="h-4 w-4" /> {t("hero.visitSite")}
                </a>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <a
                  href="https://blog.monzart.com.br/p/media-kit-monzart-santtos.html"
                  target="_blank"
                  rel="noreferrer"
                >
                  <FileText className="h-4 w-4" /> {t("hero.mediaKit")}
                </a>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a
                  href="https://blog.monzart.com.br/p/contato_01435481532.html"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Mail className="h-4 w-4" /> {t("hero.contact")}
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <Card
            key={s.key}
            className="flex flex-col items-start gap-2 p-5 transition-transform hover:-translate-y-0.5"
          >
            <s.icon className="h-5 w-5 text-primary" />
            <p className="text-2xl font-bold md:text-3xl">{s.value}</p>
            <p className="text-xs text-muted-foreground md:text-sm">{t(`stats.${s.key}`)}</p>
          </Card>
        ))}
      </section>

      {/* História */}
      <section className="grid gap-6 md:grid-cols-2">
        <Card className="space-y-3 p-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">{t("story.myStoryTitle")}</h2>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">{t("story.myStoryText")}</p>
        </Card>
        <Card className="space-y-3 p-6">
          <div className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">{t("story.howTitle")}</h2>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">{t("story.howText")}</p>
        </Card>
        <Card className="space-y-3 p-6">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">{t("story.missionTitle")}</h2>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">{t("story.missionText")}</p>
        </Card>
        <Card className="space-y-3 p-6">
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">{t("story.visionTitle")}</h2>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">{t("story.visionText")}</p>
        </Card>
      </section>

      {/* Expertise */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold md:text-2xl">{t("expertise.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("expertise.subtitle")}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {expertise.map((e) => (
            <Card key={e.key} className="space-y-2 p-5">
              <e.icon className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">{t(`expertise.${e.key}.title`)}</h3>
              <p className="text-xs text-muted-foreground md:text-sm">
                {t(`expertise.${e.key}.text`)}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* Timeline */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold md:text-2xl">{t("timeline.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("timeline.subtitle")}</p>
        </div>
        <Card className="p-4 md:p-6">
          <ol className="relative space-y-6 border-l border-border pl-6">
            {TIMELINE_YEARS.map((year) => (
              <li key={year} className="relative">
                <span className="absolute -left-[31px] flex h-4 w-4 items-center justify-center rounded-full border-2 border-primary bg-background">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                </span>
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-sm font-bold text-primary">{year}</span>
                  <h3 className="font-semibold">{t(`timeline.items.${year}.title`)}</h3>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t(`timeline.items.${year}.description`)}
                </p>
              </li>
            ))}
          </ol>
        </Card>
      </section>

      {/* Projetos */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold md:text-2xl">{t("projects.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("projects.subtitle")}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {projects.map((p) => {
            if (p.download) {
              return (
                <Card key={p.name} className="flex h-full flex-col justify-between gap-3 p-5">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{p.name}</h3>
                      <Download className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-xs text-muted-foreground md:text-sm">
                      {t(`projects.items.${p.roleKey}`)}
                    </p>
                  </div>
                  <Button asChild variant="hero" size="sm" className="w-full">
                    <a href={p.download} download>
                      <Download className="h-4 w-4" /> 📥{" "}
                      {p.ctaKey ? t(`projects.items.${p.ctaKey}`) : t("projects.download")}
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
                  <p className="text-xs text-muted-foreground md:text-sm">
                    {t(`projects.items.${p.roleKey}`)}
                  </p>
                </Card>
              </a>
            );
          })}
        </div>
      </section>

      {/* Redes sociais */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold md:text-2xl">{t("socials.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("socials.subtitle")}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          {socials.map((s) => {
            const label = "labelKey" in s && s.labelKey ? t(`socials.${s.labelKey}`) : s.label;
            return (
              <Button
                key={label as string}
                asChild
                variant="outline"
                className="h-auto justify-start gap-3 py-3"
              >
                <a href={s.href} target="_blank" rel="noreferrer">
                  <s.icon className="h-4 w-4 text-primary" />
                  <span className="truncate">{label}</span>
                </a>
              </Button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
