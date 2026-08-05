import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  LifeBuoy,
  Mail,
  Copy,
  Bug,
  Lightbulb,
  ArrowRight,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { APP_INFO } from "@/lib/app-info";
import { toast } from "sonner";

export const Route = createFileRoute("/suporte")({
  component: PublicSupportPage,
});

function PublicSupportPage() {
  const { t } = useTranslation("legal");

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(APP_INFO.supportEmail);
      toast.success(t("support.copied"));
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="container mx-auto px-6 py-24 max-w-5xl space-y-8 min-h-screen">
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

        <Card className="space-y-3 p-5 opacity-50">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <Bug className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">{t("support.reportTitle")}</h2>
            <p className="text-sm text-muted-foreground">Faça login para relatar bugs.</p>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to="/login">Entrar</Link>
          </Button>
        </Card>

        <Card className="space-y-3 p-5 opacity-50">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
            <Lightbulb className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">{t("support.suggestTitle")}</h2>
            <p className="text-sm text-muted-foreground">Faça login para sugerir melhorias.</p>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to="/login">Entrar</Link>
          </Button>
        </Card>
      </div>

      <div className="pt-8 text-center">
        <Button asChild variant="ghost">
          <Link to="/" className="gap-2">
            Voltar para a Home <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
