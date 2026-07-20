// BlogAI Pro — Onda 5: Minha Atividade (timeline pessoal).
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR, enUS } from "date-fns/locale";
import {
  Activity,
  FileText,
  Send,
  Image as ImageIcon,
  CreditCard,
  Crown,
  Coins,
  LogIn,
  MessageSquare,
  UserCog,
  Gift,
  Loader2,
  Filter,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listMyActivity } from "@/lib/activity.functions";
import type { ActivityLogRow, ActivityCategory } from "@/lib/activity.server";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/minha-atividade")({
  head: () => ({ meta: [{ title: "Minha Atividade — BlogAI Pro" }] }),
  component: MyActivityPage,
});

const CATEGORY_ICON: Record<ActivityCategory, typeof Activity> = {
  content: FileText,
  publish: Send,
  image: ImageIcon,
  payment: CreditCard,
  plan: Crown,
  credits: Coins,
  auth: LogIn,
  feedback: MessageSquare,
  profile: UserCog,
  invite: Gift,
};

const CATEGORY_ACCENT: Record<ActivityCategory, string> = {
  content: "bg-primary/10 text-primary",
  publish: "bg-success/10 text-success",
  image: "bg-chart-3/10 text-chart-3",
  payment: "bg-success/10 text-success",
  plan: "bg-warning/15 text-warning",
  credits: "bg-warning/15 text-warning",
  auth: "bg-muted text-muted-foreground",
  feedback: "bg-primary/10 text-primary",
  profile: "bg-primary/10 text-primary",
  invite: "bg-chart-3/10 text-chart-3",
};

type Range = "today" | "7d" | "30d" | "all";
const ALL_CATEGORIES: ActivityCategory[] = [
  "content",
  "publish",
  "image",
  "payment",
  "plan",
  "credits",
  "auth",
  "feedback",
  "profile",
  "invite",
];

function MyActivityPage() {
  const { t, i18n } = useTranslation("activity");
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const locale = i18n.language.startsWith("pt") ? ptBR : enUS;

  const [range, setRange] = useState<Range>("7d");
  const [category, setCategory] = useState<ActivityCategory | "all">("all");
  const [items, setItems] = useState<ActivityLogRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  const since = useMemo(() => {
    const now = Date.now();
    if (range === "today") return new Date(now - 24 * 3600 * 1000).toISOString();
    if (range === "7d") return new Date(now - 7 * 24 * 3600 * 1000).toISOString();
    if (range === "30d") return new Date(now - 30 * 24 * 3600 * 1000).toISOString();
    return undefined;
  }, [range]);

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    setPage(1);
    listMyActivity({
      data: {
        since,
        category: category === "all" ? undefined : category,
        page: 1,
        per_page: 30,
      },
    })
      .then((r) => {
        if (cancelled) return;
        setItems(r.items);
        setTotal(r.total);
      })
      .catch(() => {
        if (!cancelled) {
          setItems([]);
          setTotal(0);
        }
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [since, category]);

  const loadMore = async () => {
    const next = page + 1;
    setBusy(true);
    try {
      const r = await listMyActivity({
        data: {
          since,
          category: category === "all" ? undefined : category,
          page: next,
          per_page: 30,
        },
      });
      setItems((prev) => [...prev, ...r.items]);
      setPage(next);
    } finally {
      setBusy(false);
    }
  };

  const hasMore = items.length < total;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </header>

      <Card className="flex flex-wrap items-center gap-3 p-4">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={range} onValueChange={(v) => setRange(v as Range)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="today">{t("filters.today")}</SelectItem>
            <SelectItem value="7d">{t("filters.7d")}</SelectItem>
            <SelectItem value="30d">{t("filters.30d")}</SelectItem>
            <SelectItem value="all">{t("filters.all")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={(v) => setCategory(v as ActivityCategory | "all")}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.all_categories")}</SelectItem>
            {ALL_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{t(`categories.${c}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      <Card className="p-0">
        {busy && items.length === 0 ? (
          <div className="flex items-center justify-center p-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">{t("empty")}</div>
        ) : (
          <ol className="divide-y divide-border">
            {items.map((item) => {
              const Icon = CATEGORY_ICON[item.category] ?? Activity;
              const created = new Date(item.created_at);
              return (
                <li key={item.id} className="flex items-start gap-3 p-4">
                  <div className={`flex h-9 w-9 flex-none items-center justify-center rounded-lg ${CATEGORY_ACCENT[item.category]}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {item.description ?? item.event}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t(`categories.${item.category}`)} · {format(created, "PPp", { locale })} ·{" "}
                      {formatDistanceToNow(created, { addSuffix: true, locale })}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Card>

      {hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={loadMore} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("load_more")}
          </Button>
        </div>
      )}
    </div>
  );
}
