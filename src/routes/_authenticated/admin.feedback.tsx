import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MessageSquare, Reply, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import {
  adminFeedbackStats,
  adminListFeedbacks,
  adminReply,
  adminRemoveFeedback,
} from "@/lib/feedback.functions";

export const Route = createFileRoute("/_authenticated/admin/feedback")({
  head: () => ({ meta: [{ title: "Central de Feedback (Admin) — BlogAI Pro" }] }),
  component: AdminFeedbackPage,
});

interface StatsShape {
  total?: number;
  average_rating?: number;
  by_rating?: Record<string, number>;
  pending?: number;
  replied?: number;
}

function AdminFeedbackPage() {
  const { t, i18n } = useTranslation("admin");
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const statsFn = useServerFn(adminFeedbackStats);
  const listFn = useServerFn(adminListFeedbacks);
  const replyFn = useServerFn(adminReply);
  const removeFn = useServerFn(adminRemoveFeedback);

  useEffect(() => {
    if (isAdmin === false) navigate({ to: "/dashboard" });
  }, [isAdmin, navigate]);

  const { data: stats } = useQuery({
    queryKey: ["feedback", "admin", "stats"],
    queryFn: () => statsFn() as Promise<StatsShape>,
    enabled: isAdmin === true,
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["feedback", "admin", "list"],
    queryFn: () => listFn({ data: { limit: 100 } }),
    enabled: isAdmin === true,
  });

  const [replies, setReplies] = useState<Record<string, string>>({});

  const replyMut = useMutation({
    mutationFn: (v: { id: string; reply: string }) => replyFn({ data: v }),
    onSuccess: () => {
      toast.success(t("feedback.sent"));
      queryClient.invalidateQueries({ queryKey: ["feedback", "admin"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : t("feedback.genericError")),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => removeFn({ data: { id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feedback", "admin"] }),
  });

  if (isAdmin !== true) return null;

  const locale = i18n.language === "en-US" ? "en-US" : "pt-BR";

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      <header className="flex items-center gap-2">
        <MessageSquare className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-semibold sm:text-3xl">{t("feedback.title")}</h1>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("feedback.cards.total")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.total ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("feedback.cards.avg")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {stats?.average_rating ? stats.average_rating.toFixed(2) : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("feedback.cards.pending")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.pending ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("feedback.cards.replied")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.replied ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {stats?.by_rating && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("feedback.distributionTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((n) => {
                const count = Number(stats.by_rating?.[String(n)] ?? 0);
                const total = Number(stats.total ?? 0);
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={n} className="flex items-center gap-2 text-sm">
                    <span className="w-8">{n}★</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-16 text-right text-xs text-muted-foreground">
                      {count} ({pct}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("feedback.recent")}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t("feedback.loading")}</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("feedback.empty")}</p>
          ) : (
            <ul className="space-y-3">
              {items.map((f) => (
                <li key={f.id} className="rounded-lg border border-border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            className={`h-4 w-4 ${n <= f.rating ? "fill-primary text-primary" : "text-muted-foreground"}`}
                          />
                        ))}
                      </div>
                      <span className="text-xs font-medium">
                        {f.user_name ?? f.user_email ?? f.user_id.slice(0, 8)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(f.created_at).toLocaleString(locale)}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMut.mutate(f.id)}
                      aria-label={t("feedback.delete")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {f.comment && <p className="text-sm">{f.comment}</p>}
                  {f.suggestion && (
                    <p className="mt-1 text-sm">
                      <Badge variant="secondary" className="mr-2">
                        {t("feedback.suggestion")}
                      </Badge>
                      {f.suggestion}
                    </p>
                  )}
                  {f.issue && (
                    <p className="mt-1 text-sm">
                      <Badge variant="destructive" className="mr-2">
                        {t("feedback.issue")}
                      </Badge>
                      {f.issue}
                    </p>
                  )}

                  {f.admin_reply ? (
                    <div className="mt-2 rounded-md border border-primary/20 bg-primary/5 p-2 text-sm">
                      <p className="mb-1 text-xs font-semibold text-primary">
                        {t("feedback.replySent")}
                      </p>
                      <p>{f.admin_reply}</p>
                    </div>
                  ) : (
                    <div className="mt-2 space-y-2">
                      <Textarea
                        rows={2}
                        placeholder={t("feedback.replyPh")}
                        value={replies[f.id] ?? ""}
                        onChange={(e) => setReplies((r) => ({ ...r, [f.id]: e.target.value }))}
                      />
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          onClick={() =>
                            replyMut.mutate({ id: f.id, reply: (replies[f.id] ?? "").trim() })
                          }
                          disabled={!(replies[f.id] ?? "").trim() || replyMut.isPending}
                        >
                          <Reply className="mr-2 h-4 w-4" /> {t("feedback.reply")}
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
