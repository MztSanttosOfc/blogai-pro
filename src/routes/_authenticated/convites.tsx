// BlogAI Pro — Onda 5: Sistema de Convites (UI).
// v1.3 — Redesign visual (UX/UI apenas). Regras de negócio, API e dados: inalterados.
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
  Check,
  Sparkles,
  Rocket,
  UserPlus,
  CheckCircle2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getMyInviteStatus } from "@/lib/invites.functions";
import type { InviteStatus } from "@/lib/invites.server";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR, enUS } from "date-fns/locale";
import type { LucideIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/convites")({
  head: () => ({ meta: [{ title: "Indique e Ganhe — BlogAI Pro" }] }),
  component: InvitesPage,
});

function qrUrl(text: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(text)}`;
}

// Count-up hook (leve, sem dependências).
function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  const startedRef = useRef<number | null>(null);
  useEffect(() => {
    startedRef.current = null;
    let raf = 0;
    const tick = (t: number) => {
      if (startedRef.current === null) startedRef.current = t;
      const elapsed = t - startedRef.current;
      const p = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

interface AnimatedStatProps {
  label: string;
  value: number;
  icon: LucideIcon;
  accent: "primary" | "success" | "warning" | "chart";
  delay?: number;
}

const accentBg: Record<AnimatedStatProps["accent"], string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/15 text-warning",
  chart: "bg-chart-3/10 text-chart-3",
};

function AnimatedStat({ label, value, icon: Icon, accent, delay = 0 }: AnimatedStatProps) {
  const count = useCountUp(value);
  return (
    <Card
      className="group relative flex flex-col gap-3 overflow-hidden p-5 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-elegant animate-fade-in"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/5 blur-2xl transition-opacity group-hover:opacity-70 opacity-40" />
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg transition-transform group-hover:scale-110", accentBg[accent])}>
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>
      <div className="font-display text-3xl font-bold tabular-nums text-foreground">{count}</div>
    </Card>
  );
}

function InvitesPage() {
  const { t, i18n } = useTranslation("invites");
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const locale = i18n.language.startsWith("pt") ? ptBR : enUS;

  const [status, setStatus] = useState<InviteStatus | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  const load = () => {
    setBusy(true);
    setError(null);
    getMyInviteStatus()
      .then((r) => setStatus(r))
      .catch((e: Error) => setError(e?.message ?? "unknown"))
      .finally(() => setBusy(false));
  };

  useEffect(() => {
    if (!user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Meta motivacional para próxima recompensa (5 qualificados).
  const goal = 5;
  const qualified = status?.totals.rewarded ?? 0;
  const nextReward = Math.max(0, goal - (qualified % goal));
  const progressPct = Math.min(100, ((qualified % goal) / goal) * 100);

  useEffect(() => {
    if (!status) return;
    const timer = setTimeout(() => setProgress(progressPct), 200);
    return () => clearTimeout(timer);
  }, [status, progressPct]);

  const copy = async () => {
    if (!status) return;
    try {
      await navigator.clipboard.writeText(status.invite_link);
      setCopied(true);
      toast.success(t("copied"));
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  const share = async () => {
    if (!status) return;
    const text = `${t("share_text")} ${status.invite_link}`;
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await (
          navigator as unknown as {
            share: (d: { title: string; text: string; url: string }) => Promise<void>;
          }
        ).share({ title: "BlogAI Pro", text: t("share_text"), url: status.invite_link });
        return;
      } catch {
        /* fall through */
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("copied"));
    } catch {
      /* ignore */
    }
  };

  const qr = useMemo(() => (status ? qrUrl(status.invite_link) : ""), [status]);

  if (busy) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!status) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-10">
        <Card className="flex flex-col items-center gap-4 p-10 text-center animate-fade-in">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Gift className="h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold">Não foi possível carregar seus convites agora.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {error ? `Detalhe técnico: ${error}` : "Estamos preparando seu código de indicação."}
            </p>
          </div>
          <Button variant="hero" onClick={load}>
            Tentar novamente
          </Button>
        </Card>
      </div>
    );
  }

  const isEmpty = status.history.length === 0;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-background to-chart-3/10 p-6 md:p-10 animate-fade-in">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-chart-3/20 blur-3xl" />
        <div className="relative flex flex-col items-start gap-5 md:flex-row md:items-center md:gap-8">
          <div
            className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-chart-3 text-primary-foreground shadow-elegant animate-scale-in"
            aria-hidden
          >
            <Gift className="h-10 w-10" />
            <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-background text-primary shadow-soft">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <Badge variant="secondary" className="mb-2 gap-1">
              <Sparkles className="h-3 w-3" /> +30 créditos
            </Badge>
            <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
              {t("title")}
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground md:text-base">
              {t("subtitle")}
            </p>
          </div>
        </div>
      </section>

      {/* Stats com count-up */}
      <div className="grid gap-4 md:grid-cols-4">
        <AnimatedStat label={t("stats.total")} value={status.totals.total} icon={Users} accent="primary" delay={0} />
        <AnimatedStat label={t("stats.rewarded")} value={status.totals.rewarded} icon={Award} accent="success" delay={80} />
        <AnimatedStat label={t("stats.pending")} value={status.totals.pending} icon={Clock} accent="warning" delay={160} />
        <AnimatedStat label={t("stats.credits")} value={status.totals.credits_earned} icon={Coins} accent="chart" delay={240} />
      </div>

      {/* Barra de progresso — próxima recompensa */}
      <Card className="relative overflow-hidden p-6 animate-fade-in" style={{ animationDelay: "300ms", animationFillMode: "both" }}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Rocket className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Próxima recompensa</p>
              <p className="text-xs text-muted-foreground">
                Faltam <span className="font-semibold text-foreground">{nextReward}</span>{" "}
                {nextReward === 1 ? "indicação qualificada" : "indicações qualificadas"}
              </p>
            </div>
          </div>
          <span className="font-mono text-sm text-muted-foreground tabular-nums">
            {qualified % goal}/{goal}
          </span>
        </div>
        <Progress value={progress} className="h-3 bg-primary/15 [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-chart-3 [&>div]:transition-all [&>div]:duration-1000" />
      </Card>

      {/* Código + QR */}
      <div className="grid gap-6 md:grid-cols-[1fr_260px]">
        <Card
          className="group relative flex flex-col gap-4 overflow-hidden p-6 shadow-soft transition-all duration-300 hover:shadow-elegant animate-fade-in"
          style={{ animationDelay: "360ms", animationFillMode: "both" }}
        >
          <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 bg-gradient-to-br from-primary/5 via-transparent to-chart-3/5" />
          <div className="relative">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("your_code")}</p>
            <p className="font-display text-3xl font-bold tracking-widest bg-gradient-to-r from-primary to-chart-3 bg-clip-text text-transparent">
              {status.code}
            </p>
          </div>
          <div className="relative">
            <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">{t("your_link")}</p>
            <div className="flex gap-2">
              <Input readOnly value={status.invite_link} className="font-mono text-sm" />
              <Button onClick={copy} variant="outline" size="icon" aria-label={t("copy")} className="transition-transform active:scale-95">
                {copied ? <Check className="h-4 w-4 text-success animate-scale-in" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="relative flex flex-wrap gap-2">
            <Button onClick={copy} variant="outline" className="transition-transform active:scale-95">
              {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              {copied ? t("copied") : t("copy")}
            </Button>
            <Button onClick={share} variant="hero" className="transition-transform hover:scale-[1.02] active:scale-95">
              <Share2 className="h-4 w-4" />
              {t("share")}
            </Button>
          </div>

          <div className="relative mt-2 rounded-lg border border-border bg-muted/30 p-4 text-sm">
            <p className="mb-2 font-medium">{t("how_it_works.title")}</p>
            <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
              <li>{t("how_it_works.step1")}</li>
              <li>{t("how_it_works.step2")}</li>
              <li>{t("how_it_works.step3")}</li>
            </ol>
          </div>
        </Card>

        <Card
          className="flex flex-col items-center gap-3 p-6 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-elegant animate-fade-in"
          style={{ animationDelay: "420ms", animationFillMode: "both" }}
        >
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
              className="rounded-lg border border-border bg-white p-2 transition-transform hover:scale-[1.03]"
              loading="lazy"
            />
          )}
        </Card>
      </div>

      {/* Histórico / Timeline / Empty state */}
      <Card className="overflow-hidden p-0 animate-fade-in" style={{ animationDelay: "480ms", animationFillMode: "both" }}>
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2 font-semibold">
            <Clock className="h-4 w-4 text-muted-foreground" />
            {t("history.title")}
          </div>
          {!isEmpty && (
            <Badge variant="secondary" className="tabular-nums">
              {status.history.length}
            </Badge>
          )}
        </div>

        {isEmpty ? (
          <div className="flex flex-col items-center gap-4 p-10 text-center">
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-chart-3/15 text-primary animate-scale-in">
              <Gift className="h-9 w-9" />
              <span className="absolute inset-0 rounded-full bg-primary/20 blur-xl" aria-hidden />
            </div>
            <div className="max-w-md">
              <p className="font-display text-lg font-semibold">{t("history.empty")}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Convide seu primeiro amigo e ganhe 30 créditos quando ele começar a utilizar o BlogAI Pro.
              </p>
            </div>
            <Button onClick={share} variant="hero" size="lg" className="transition-transform hover:scale-[1.02] active:scale-95">
              <Rocket className="h-4 w-4" />
              Compartilhar meu convite
            </Button>
          </div>
        ) : (
          <ol className="relative">
            {status.history.map((row, idx) => {
              const isRewarded = row.status === "rewarded";
              const Icon = isRewarded ? CheckCircle2 : UserPlus;
              return (
                <li
                  key={row.id}
                  className="relative flex items-start gap-4 p-4 pl-6 animate-fade-in border-b border-border last:border-b-0"
                  style={{ animationDelay: `${idx * 60}ms`, animationFillMode: "both" }}
                >
                  {/* Rail */}
                  <span
                    className="absolute left-[30px] top-0 bottom-0 w-px bg-border last:hidden"
                    aria-hidden
                  />
                  <div
                    className={cn(
                      "relative z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border shadow-soft",
                      isRewarded ? "bg-success/10 text-success" : "bg-primary/10 text-primary",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs text-muted-foreground">
                      {row.invitee_id.slice(0, 8)}…
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(row.created_at), "PPp", { locale })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {row.credits_awarded > 0 && (
                      <span className="text-sm font-semibold text-success tabular-nums">
                        +{row.credits_awarded}
                      </span>
                    )}
                    <Badge variant={isRewarded ? "default" : "secondary"}>
                      {t(`history.status.${row.status}`)}
                    </Badge>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Card>
    </div>
  );
}
