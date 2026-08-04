import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ExternalLink, Scale } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OPEN_SOURCE_LIBRARIES, isEnglish } from "@/lib/legal-content";

export const Route = createFileRoute("/_authenticated/legal/licencas")({
  head: () => ({
    meta: [
      { title: "Licenças Open Source — BlogAI Pro" },
      {
        name: "description",
        content:
          "Lista das principais bibliotecas de código aberto utilizadas pelo BlogAI Pro e suas licenças.",
      },
      { property: "og:title", content: "Licenças Open Source — BlogAI Pro" },
      {
        property: "og:description",
        content: "React, TanStack, Supabase, Tailwind, Radix UI, TipTap, Capacitor e mais.",
      },
    ],
  }),
  component: LicensesPage,
});

function LicensesPage() {
  const { t, i18n } = useTranslation("legal");
  const lang = isEnglish(i18n.language) ? "en-US" : "pt-BR";

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="gap-2">
        <Link to="/legal">
          <ArrowLeft className="h-4 w-4" />
          {t("nav.back")}
        </Link>
      </Button>

      <Card className="overflow-hidden border-border/60">
        <div className="bg-gradient-to-br from-primary/12 via-primary/5 to-transparent p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Scale className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {t("licenses.title")}
              </h1>
              <p className="text-sm text-muted-foreground sm:text-base">{t("licenses.subtitle")}</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        {OPEN_SOURCE_LIBRARIES.map((lib, i) => (
          <motion.div
            key={lib.name}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.25, delay: Math.min(i, 8) * 0.03 }}
          >
            <Card className="h-full p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="truncate font-semibold">{lib.name}</p>
                  <p className="text-sm text-muted-foreground">{lib.usage[lang]}</p>
                </div>
                <Badge variant="outline" className="shrink-0 font-normal">
                  {lib.license}
                </Badge>
              </div>
              <a
                href={lib.url}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                aria-label={`${t("licenses.visit")}: ${lib.name}`}
              >
                {t("licenses.visit")}
                <ExternalLink className="h-3 w-3" />
              </a>
            </Card>
          </motion.div>
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground">{t("licenses.note")}</p>
    </div>
  );
}
