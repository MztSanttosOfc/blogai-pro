import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  CalendarClock,
  Plus,
  Trash2,
  Ban,
  ExternalLink,
  Loader2,
  ScrollText,
  Clock,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  listScheduledPosts,
  schedulePost,
  rescheduleScheduledPost,
  cancelScheduledPost,
  deleteScheduledPost,
  getScheduledPostLogs,
  type ScheduledPostRow,
} from "@/lib/scheduling.functions";

export const Route = createFileRoute("/_authenticated/agendamentos")({
  head: () => ({
    meta: [
      { title: "Agendamentos — BlogAI Pro" },
      {
        name: "description",
        content:
          "Agende a publicação automática dos seus artigos no Blogger na data e horário que preferir.",
      },
    ],
  }),
  component: SchedulingPage,
});

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pending: { label: "Agendado", cls: "bg-primary/15 text-primary" },
  published: { label: "Publicado", cls: "bg-success/15 text-success" },
  failed: { label: "Falhou", cls: "bg-destructive/15 text-destructive" },
  canceled: { label: "Cancelado", cls: "bg-muted text-muted-foreground" },
};

function toLocalInput(iso?: string) {
  const d = iso ? new Date(iso) : new Date(Date.now() + 60 * 60 * 1000);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

function SchedulingPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [articleId, setArticleId] = useState("");
  const [when, setWhen] = useState(toLocalInput());
  const [saving, setSaving] = useState(false);
  const [logsFor, setLogsFor] = useState<string | null>(null);

  const listFn = useServerFn(listScheduledPosts);
  const scheduleFn = useServerFn(schedulePost);
  const rescheduleFn = useServerFn(rescheduleScheduledPost);
  const cancelFn = useServerFn(cancelScheduledPost);
  const deleteFn = useServerFn(deleteScheduledPost);
  const logsFn = useServerFn(getScheduledPostLogs);

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["scheduled-posts", user?.id],
    queryFn: () => listFn(),
    enabled: !!user,
  });

  const { data: articles = [] } = useQuery({
    queryKey: ["articles-for-schedule", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("articles")
        .select("id, title, keyword")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["scheduled-logs", logsFor],
    queryFn: () => logsFn({ data: { id: logsFor! } }),
    enabled: !!logsFor,
  });

  const openNew = () => {
    setEditId(null);
    setArticleId("");
    setWhen(toLocalInput());
    setDialogOpen(true);
  };

  const openEdit = (s: ScheduledPostRow) => {
    setEditId(s.id);
    setArticleId(s.article_id);
    setWhen(toLocalInput(s.scheduled_at));
    setDialogOpen(true);
  };

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["scheduled-posts", user?.id] });

  const handleSave = async () => {
    if (!editId && !articleId) {
      toast.error("Selecione um artigo.");
      return;
    }
    const scheduledAt = new Date(when).toISOString();
    setSaving(true);
    try {
      if (editId) {
        await rescheduleFn({ data: { id: editId, scheduledAt } });
        toast.success("Agendamento atualizado.");
      } else {
        await scheduleFn({ data: { articleId, scheduledAt } });
        toast.success("Artigo agendado com sucesso.");
      }
      setDialogOpen(false);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelFn({ data: { id } });
      toast.success("Agendamento cancelado.");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao cancelar.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteFn({ data: { id } });
      toast.success("Agendamento excluído.");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir.");
    }
  };

  const pendingCount = useMemo(
    () => schedules.filter((s) => s.status === "pending").length,
    [schedules],
  );

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <CalendarClock className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold md:text-3xl">Agendamentos</h1>
            <p className="text-sm text-muted-foreground">
              {pendingCount} publicação(ões) agendada(s) para o Blogger.
            </p>
          </div>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-1 h-4 w-4" /> Novo agendamento
        </Button>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : schedules.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <Clock className="h-10 w-10 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Nenhum agendamento ainda</h3>
          <p className="max-w-md text-sm text-muted-foreground">
            Agende seus artigos para serem publicados automaticamente no Blogger na data e horário
            que você definir.
          </p>
          <Button onClick={openNew}>
            <Plus className="mr-1 h-4 w-4" /> Criar primeiro agendamento
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {schedules.map((s) => {
            const meta = STATUS_META[s.status] ?? STATUS_META.pending;
            return (
              <Card key={s.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={`border-0 ${meta.cls}`}>{meta.label}</Badge>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarClock className="h-3.5 w-3.5" />
                        {format(new Date(s.scheduled_at), "dd/MM/yyyy 'às' HH:mm")}
                      </span>
                    </div>
                    <h3 className="mt-2 break-words font-semibold">{s.article_title}</h3>
                    {s.error && (
                      <p className="mt-1 break-words text-xs text-destructive">{s.error}</p>
                    )}
                    {s.blogger_post_url && (
                      <a
                        href={s.blogger_post_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        Ver publicação <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setLogsFor(s.id)}
                      aria-label="Registros"
                    >
                      <ScrollText className="h-4 w-4" />
                    </Button>
                    {s.status === "pending" && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(s)}>
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCancel(s.id)}
                          aria-label="Cancelar"
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {s.status === "failed" && (
                      <Button size="sm" variant="ghost" onClick={() => openEdit(s)}>
                        Reagendar
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => handleDelete(s.id)}
                      aria-label="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Editar agendamento" : "Agendar publicação"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!editId && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Artigo</label>
                <Select value={articleId} onValueChange={setArticleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um artigo" />
                  </SelectTrigger>
                  <SelectContent>
                    {articles.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.title || a.keyword}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Data e horário</label>
              <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              {editId ? "Salvar" : "Agendar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!logsFor} onOpenChange={(o) => !o && setLogsFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registros de execução</DialogTitle>
          </DialogHeader>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum registro ainda. Os logs aparecem após a execução do agendamento.
              </p>
            ) : (
              logs.map((l) => (
                <div key={l.id} className="rounded-lg border border-border p-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge
                      className={`border-0 ${
                        l.level === "error"
                          ? "bg-destructive/15 text-destructive"
                          : "bg-success/15 text-success"
                      }`}
                    >
                      {l.level === "error" ? "Erro" : "Info"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(l.created_at), "dd/MM HH:mm:ss")}
                    </span>
                  </div>
                  <p className="mt-1 break-words">{l.message}</p>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
