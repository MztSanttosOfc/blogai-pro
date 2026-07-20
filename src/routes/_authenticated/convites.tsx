// BlogAI Pro — Onda 5: Sistema de Convites (UI).
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Gift,
  Copy,
  Share2,
  Loader2,
  QrCode as QrCodeIcon,
  Users,
  Award,
  Clock,
  Coins,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/StatCard";
import { getMyInviteStatus } from "@/lib/invites.functions";
import type { InviteStatus } from "@/lib/invites.server";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { ptBR, enUS } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/convites")({
  head: () => ({ meta: [{ title: "Indique e Ganhe — BlogAI Pro" }] }),
  component: InvitesPage,
});

// Simple QR generator via public API (no dependency). Fallback: link only.
function qrUrl(text: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(text)}`;
}

function InvitesPage() {
  const { t, i18n } = useTranslation("invites");
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const locale = i18n.language.startsWith("pt") ? ptBR : enUS;

  const [status, setStatus] = useState<InviteStatus | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    setBusy(true);
    getMyInviteStatus()
      .then((r) => setStatus(r))
      .catch(() => toast.error("Erro ao carregar convites."))
      .finally(() => setBusy(false));
  }, [user]);

  const copy = async () => {
    if (!status) return;
    try {
      await navigator.clipboard.writeText(status.invite_link);
      toast.success(t("copied"));
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  const share = async () => {
    if (!status) return;
    const text = `${t("share_text")} ${status.invite_link}`;
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await (navigator as unknown as { share: (d: { title: string; text: string; url: string }) => Promise<void> }).share({
          title: "BlogAI Pro",
          text: t("share_text"),
          url: status.invite_link,
        });
        return;
      } catch {
        /* fall through */
      }
    }
    // Fallback: copy
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("copied"));
    } catch {
      /* ignore */
    }
  };

  const qr = useMemo(() => (status ? qrUrl(status.invite_link) : ""), [status]);

  if (busy || !status) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Gift className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label={t("stats.total")} value={status.totals.total} icon={Users} accent="primary" />
        <StatCard label={t("stats.rewarded")} value={status.totals.rewarded} icon={Award} accent="success" />
        <StatCard label={t("stats.pending")} value={status.totals.pending} icon={Clock} accent="warning" />
        <StatCard label={t("stats.credits")} value={status.totals.credits_earned} icon={Coins} accent="chart" />
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_260px]">
        <Card className="flex flex-col gap-4 p-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("your_code")}</p>
            <p className="font-display text-2xl font-bold tracking-widest">{status.code}</p>
          </div>
          <div>
            <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">{t("your_link")}</p>
            <div className="flex gap-2">
              <Input readOnly value={status.invite_link} className="font-mono text-sm" />
              <Button onClick={copy} variant="outline" size="icon" aria-label={t("copy")}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={copy} variant="outline">
              <Copy className="h-4 w-4" />
              {t("copy")}
            </Button>
            <Button onClick={share} variant="hero">
              <Share2 className="h-4 w-4" />
              {t("share")}
            </Button>
          </div>

          <div className="mt-4 rounded-lg border border-border bg-muted/30 p-4 text-sm">
            <p className="mb-2 font-medium">{t("how_it_works.title")}</p>
            <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
              <li>{t("how_it_works.step1")}</li>
              <li>{t("how_it_works.step2")}</li>
              <li>{t("how_it_works.step3")}</li>
            </ol>
          </div>
        </Card>

        <Card className="flex flex-col items-center gap-3 p-6">
          <div className="flex items-center gap-2 text-sm font-medium">
            <QrCodeIcon className="h-4 w-4" />
            {t("qr_code")}
          </div>
          {qr && (
            <img
              src={qr}
              alt="QR Code"
              width={220}
              height={220}
              className="rounded-lg border border-border bg-white p-2"
              loading="lazy"
            />
          )}
        </Card>
      </div>

      <Card className="p-0">
        <div className="border-b border-border p-4 font-semibold">{t("history.title")}</div>
        {status.history.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">{t("history.empty")}</div>
        ) : (
          <ol className="divide-y divide-border">
            {status.history.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs text-muted-foreground">{row.invitee_id.slice(0, 8)}…</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(row.created_at), "PPp", { locale })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {row.credits_awarded > 0 && (
                    <span className="text-sm font-medium text-success">+{row.credits_awarded}</span>
                  )}
                  <Badge variant={row.status === "rewarded" ? "default" : "secondary"}>
                    {t(`history.status.${row.status}`)}
                  </Badge>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
