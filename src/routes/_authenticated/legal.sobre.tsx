import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ExternalLink, Globe, Mail, ShieldCheck, FileText, LifeBuoy } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { BrandLogo } from "@/components/BrandLogo";
import { APP_INFO } from "@/lib/app-info";

export const Route = createFileRoute("/_authenticated/legal/sobre")({
  head: () => ({
    meta: [
      { title: "Sobre o BlogAI Pro — versão, desenvolvedor e contato" },
      {
        name: "description",
        content:
          "Informações oficiais do BlogAI Pro: versão do aplicativo, desenvolvedor, site oficial, contato e links legais.",
      },
      { property: "og:title", content: "Sobre o BlogAI Pro" },
      {
        property: "og:description",
        content: "Versão, desenvolvedor, contato e links oficiais do BlogAI Pro.",
      },
    ],
  }),
  component: AboutPage,
});

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function AboutPage() {
  const { t } = useTranslation("legal");

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="gap-2">
        <Link to="/legal">
          <ArrowLeft className="h-4 w-4" />
          {t("nav.back")}
        </Link>
      </Button>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <Card className="overflow-hidden border-border/60">
          <div className="flex flex-col items-center gap-4 bg-gradient-to-b from-primary/12 to-transparent p-8 text-center">
            <BrandLogo />
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight">{APP_INFO.name}</h1>
              <p className="text-sm text-muted-foreground">{t("about.tagline")}</p>
            </div>
            <Badge variant="outline" className="font-normal">
              v{APP_INFO.version} · {APP_INFO.buildChannel}
            </Badge>
          </div>
          <div className="space-y-4 p-6">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("about.description")}
            </p>
            <Separator />
            <div className="divide-y divide-border/60">
              <InfoRow label={t("about.version")} value={APP_INFO.version} />
              <InfoRow label={t("about.channel")} value={APP_INFO.buildChannel} />
              <InfoRow label={t("about.package")} value={APP_INFO.androidPackage} />
              <InfoRow label={t("about.developer")} value={APP_INFO.developerFull} />
            </div>
          </div>
        </Card>
      </motion.div>

      <Card className="space-y-3 p-6">
        <h2 className="font-semibold">{t("about.links")}</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <a
            href={APP_INFO.website}
            target="_blank"
            rel="noreferrer noopener"
            className="flex items-center gap-2 rounded-lg border border-border/60 p-3 text-sm transition-colors hover:bg-accent"
          >
            <Globe className="h-4 w-4 text-primary" />
            {t("about.website")}
            <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground" />
          </a>
          <a
            href={`mailto:${APP_INFO.supportEmail}`}
            className="flex items-center gap-2 rounded-lg border border-border/60 p-3 text-sm transition-colors hover:bg-accent"
          >
            <Mail className="h-4 w-4 text-primary" />
            {t("about.contact")}
          </a>
          <Link
            to="/legal/privacidade"
            className="flex items-center gap-2 rounded-lg border border-border/60 p-3 text-sm transition-colors hover:bg-accent"
          >
            <ShieldCheck className="h-4 w-4 text-primary" />
            {t("nav.privacidade")}
          </Link>
          <Link
            to="/legal/termos"
            className="flex items-center gap-2 rounded-lg border border-border/60 p-3 text-sm transition-colors hover:bg-accent"
          >
            <FileText className="h-4 w-4 text-primary" />
            {t("nav.termos")}
          </Link>
          <Link
            to="/suporte"
            className="flex items-center gap-2 rounded-lg border border-border/60 p-3 text-sm transition-colors hover:bg-accent"
          >
            <LifeBuoy className="h-4 w-4 text-primary" />
            {t("about.support")}
          </Link>
          <Link
            to="/criador"
            className="flex items-center gap-2 rounded-lg border border-border/60 p-3 text-sm transition-colors hover:bg-accent"
          >
            <Globe className="h-4 w-4 text-primary" />
            {t("about.creator")}
          </Link>
        </div>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        © {APP_INFO.copyrightYear} {APP_INFO.developer}. {t("about.copyright")}
      </p>
    </div>
  );
}
