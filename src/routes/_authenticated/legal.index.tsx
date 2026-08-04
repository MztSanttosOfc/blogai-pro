import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  ShieldCheck,
  FileText,
  Cookie,
  Scale,
  Info,
  ArrowRight,
  BadgeCheck,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LEGAL_DOC_ORDER, LEGAL_ROUTES, type LegalDocId } from "@/lib/legal-content";

export const Route = createFileRoute("/_authenticated/legal/")({
  head: () => ({
    meta: [
      { title: "Legal — BlogAI Pro" },
      {
        name: "description",
        content:
          "Política de Privacidade, Termos de Uso, Política de Cookies, licenças open source e informações sobre o BlogAI Pro.",
      },
      { property: "og:title", content: "Legal — BlogAI Pro" },
      {
        property: "og:description",
        content: "Documentos legais e de conformidade do BlogAI Pro.",
      },
    ],
  }),
  component: LegalHub,
});

const ICONS: Record<LegalDocId, typeof ShieldCheck> = {
  privacidade: ShieldCheck,
  termos: FileText,
  cookies: Cookie,
  licencas: Scale,
  sobre: Info,
};

function LegalHub() {
  const { t } = useTranslation("legal");

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-2"
      >
        <h1 className="text-3xl font-bold tracking-tight">{t("nav.title")}</h1>
        <p className="text-muted-foreground">{t("nav.subtitle")}</p>
      </motion.header>

      <Card className="flex flex-col items-start gap-3 border-primary/25 bg-primary/5 p-5 sm:flex-row sm:items-center">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <BadgeCheck className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold">{t("hub.complianceTitle")}</p>
          <p className="text-sm text-muted-foreground">{t("hub.complianceDesc")}</p>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {LEGAL_DOC_ORDER.map((id, i) => {
          const Icon = ICONS[id];
          return (
            <motion.div
              key={id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <Card className="group h-full p-5 transition-colors hover:border-primary/40">
                <div className="flex h-full flex-col gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <h2 className="font-semibold">{t(`nav.${id}`)}</h2>
                    <p className="text-sm text-muted-foreground">{t(`hub.${id}Desc`)}</p>
                  </div>
                  <Button asChild variant="ghost" size="sm" className="w-fit gap-2 px-2">
                    <Link to={LEGAL_ROUTES[id]}>
                      {t("hub.open")}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </Button>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
