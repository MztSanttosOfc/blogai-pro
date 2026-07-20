// BlogAI Pro — Onda 5: Painel de Analytics (admin).
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BarChart3,
  FileText,
  Send,
  CalendarClock,
  Users,
  Coins,
  Loader2,
  Sparkles,
  Gift,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/StatCard";
import { getAnalyticsOverview } from "@/lib/analytics.functions";
import type { AnalyticsOverview } from "@/lib/analytics.server";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analytics — BlogAI Pro" }] }),
  component: AnalyticsPage,
});

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2, var(--primary)))",
  "hsl(var(--chart-3, var(--primary)))",
  "hsl(var(--chart-4, var(--primary)))",
  "hsl(var(--chart-5, var(--primary)))",
];

function AnalyticsPage() {
  const { t } = useTranslation("analytics");
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !isAdmin) navigate({ to: "/dashboard" });
  }, [loading, isAdmin, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    setBusy(true);
    getAnalyticsOverview()
      .then(setData)
      .catch((e: Error) => setError(e.message || "erro"))
      .finally(() => setBusy(false));
  }, [isAdmin]);

  if (!isAdmin) return null;
  if (busy) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error || !data) {
    return <div className="p-8 text-sm text-muted-foreground">{t("empty")}</div>;
  }

  const planData = Object.entries(data.users.by_plan ?? {}).map(([name, value]) => ({
    name,
    value,
  }));
  const catData = data.ai.top_categories.map((c) => ({ name: c.category, value: c.total }));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <header className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <BarChart3 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t("sections.content")}</h2>
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
          <StatCard label={t("cards.articles_total")} value={data.content.articles_total} icon={FileText} accent="primary" />
          <StatCard label={t("cards.articles_published")} value={data.content.articles_published} icon={Send} accent="success" />
          <StatCard label={t("cards.articles_scheduled")} value={data.content.articles_scheduled} icon={CalendarClock} accent="warning" />
          <StatCard label={t("cards.pages_total")} value={data.content.pages_total} icon={FileText} accent="chart" />
          <StatCard label={t("cards.pages_published")} value={data.content.pages_published} icon={Send} accent="success" />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t("sections.users")}</h2>
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
          <StatCard label={t("cards.users_total")} value={data.users.total} icon={Users} accent="primary" />
          <StatCard label={t("cards.users_new_7d")} value={data.users.new_7d} icon={Users} accent="success" />
          <StatCard label={t("cards.users_new_30d")} value={data.users.new_30d} icon={Users} accent="chart" />
          <StatCard label={t("cards.users_active_7d")} value={data.users.active_7d} icon={Users} accent="success" />
          <StatCard label={t("cards.users_active_30d")} value={data.users.active_30d} icon={Users} accent="warning" />
        </div>
        {planData.length > 0 && (
          <Card className="p-5">
            <p className="mb-4 text-sm font-medium">{t("charts.by_plan")}</p>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={planData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {planData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t("sections.credits")}</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard label={t("cards.credits_granted")} value={data.credits.granted} icon={Coins} accent="primary" />
          <StatCard label={t("cards.credits_purchased")} value={data.credits.purchased} icon={Coins} accent="success" />
          <StatCard label={t("cards.credits_consumed")} value={data.credits.consumed} icon={Coins} accent="warning" />
          <StatCard label={t("cards.credits_avg")} value={data.credits.avg_per_user} icon={Coins} accent="chart" />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t("sections.usage")}</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard label={t("cards.articles_per_user")} value={data.usage.articles_per_user} icon={FileText} accent="primary" />
          <StatCard label={t("cards.pages_per_user")} value={data.usage.pages_per_user} icon={FileText} accent="chart" />
          <StatCard label={t("cards.events_24h")} value={data.usage.events_24h} icon={Sparkles} accent="success" />
          <StatCard label={t("cards.events_7d")} value={data.usage.events_7d} icon={Sparkles} accent="warning" />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t("sections.ai")}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label={t("cards.invites_total")} value={data.ai.invites.total} icon={Gift} accent="primary" />
          <StatCard label={t("cards.invites_rewarded")} value={data.ai.invites.rewarded} icon={Gift} accent="success" />
          <StatCard label={t("cards.invites_credits")} value={data.ai.invites.credits_distributed} icon={Coins} accent="warning" />
        </div>
        {catData.length > 0 && (
          <Card className="p-5">
            <p className="mb-4 text-sm font-medium">{t("charts.top_categories")}</p>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={catData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {catData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </section>
    </div>
  );
}
