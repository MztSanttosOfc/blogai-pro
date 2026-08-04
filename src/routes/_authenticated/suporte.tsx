import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  LifeBuoy,
  Mail,
  Copy,
  Bug,
  Lightbulb,
  Activity,
  CheckCircle2,
  Loader2,
  ArrowRight,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { APP_INFO } from "@/lib/app-info";
import { getBloggerStatus } from "@/lib/blogger.functions";

export const Route = createFileRoute("/_authenticated/suporte")({
  head: () => ({
    meta: [
      { title: "Central de Suporte — BlogAI Pro" },
      {
        name: "description",
        content:
          "Perguntas frequentes, contato, relato de problemas e status das integrações do BlogAI Pro.",
      },
      { property: "og:title", content: "Central de Suporte — BlogAI Pro" },
      {
        property: "og:description",
        content: "Tire dúvidas, fale com o suporte e acompanhe o estado das integrações.",
      },
    ],
  }),
  component: SupportPage,
});

function SupportPage() {
  const { t } = useTranslation("legal");
  const [blogger, setBlogger] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    getBloggerStatus()
      .then((s: unknown) => {
        if (!active) return;
        const connected = Boolean((s as { connected?: boolean } | null)?.connected);
        setBlogger(connected);
      })
      .catch(() => active && setBlogger(false));
    return () => {
      active = false;
    };
  }, []);

  const faq = t("support.faq", { returnObjects: true }) as { q: string; a: string }[];

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(APP_INFO.supportEmail);
      toast.success(t("support.copied"));
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex items-start gap-4"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <LifeBuoy className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t("support.title")}</h1>
          <p className="text-muted-foreground">{t("support.subtitle")}</p>
        </div>
      </motion.header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="space-y-3 p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">{t("support.contactTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("support.contactDesc")}</p>
          </div>
          <p className="break-all text-sm font-medium">{APP_INFO.supportEmail}</p>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <a href={`mailto:${APP_INFO.supportEmail}`}>{t("support.email")}</a>
            </Button>
            <Button size="sm" variant="outline" className="gap-2" onClick={copyEmail}>
              <Copy className="h-4 w-4" />
              {t("support.copyEmail")}
            </Button>
          </div>
        </Card>

        <Card className="space-y-3 p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <Bug className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">{t("support.reportTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("support.reportDesc")}</p>
          </div>
          <Button asChild size="sm" variant="outline" className="gap-2">
            <Link to="/feedback">
              {t("support.openFeedback")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </Card>

        <Card className="space-y-3 p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
            <Lightbulb className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">{t("support.suggestTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("support.suggestDesc")}</p>
          </div>
          <Button asChild size="sm" variant="outline" className="gap-2">
            <Link to="/feedback">
              {t("support.openFeedback")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </Card>
      </div>

      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <div>
            <h2 className="font-semibold">{t("support.statusTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("support.statusDesc")}</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <StatusRow label="BlogAI Pro" state="ok" okLabel={t("support.operational")} />
          <StatusRow
            label="Blogger"
            state={blogger === null ? "loading" : blogger ? "ok" : "off"}
            okLabel={t("support.connected")}
            offLabel={t("support.disconnected")}
          />
          <StatusRow
            label="Google Search Console"
            state={blogger === null ? "loading" : blogger ? "ok" : "off"}
            okLabel={t("support.connected")}
            offLabel={t("support.disconnected")}
          />
          <StatusRow label="Stripe / SyncPay" state="ok" okLabel={t("support.operational")} />
        </div>
        <Button asChild size="sm" variant="ghost" className="mt-4 gap-2 px-2">
          <Link to="/ajuda">
            {t("support.helpCenter")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </Card>

      <Card className="p-6">
        <h2 className="mb-3 font-semibold">{t("support.faqTitle")}</h2>
        <Accordion type="single" collapsible className="w-full">
          {faq.map((item, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger className="text-left text-sm">{item.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Card>
    </div>
  );
}

function StatusRow({
  label,
  state,
  okLabel,
  offLabel,
}: {
  label: string;
  state: "ok" | "off" | "loading";
  okLabel: string;
  offLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/50 p-3">
      <span className="text-sm font-medium">{label}</span>
      {state === "loading" ? (
        <Skeleton className="h-5 w-24" />
      ) : state === "ok" ? (
        <Badge className="gap-1 bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/20">
          <CheckCircle2 className="h-3 w-3" />
          {okLabel}
        </Badge>
      ) : (
        <Badge variant="outline">{offLabel}</Badge>
      )}
    </div>
  );
}

export { Loader2 as _unused };
