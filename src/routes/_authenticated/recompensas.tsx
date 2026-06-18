import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Gift,
  BookOpen,
  Clock,
  Coins,
  CheckCircle2,
  Trophy,
  RefreshCw,
  Settings2,
  BarChart3,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import {
  getRewardData,
  openMission,
  submitMission,
  getRewardAdminData,
  updateRewardSettings,
  setMissionStatus,
  syncRewardMissions,
  type RewardConfig,
  type RewardMission,
  type MissionReader,
  type RewardAdminMission,
  type RewardAdminStats,
} from "@/lib/rewards.functions";

export const Route = createFileRoute("/_authenticated/recompensas")({
  head: () => ({
    meta: [
      { title: "Central de Recompensas — BlogAI Pro" },
      {
        name: "description",
        content:
          "Ganhe créditos aprendendo: leia conteúdos educacionais, conclua o quiz e seja recompensado no BlogAI Pro.",
      },
    ],
  }),
  component: RewardsPage,
});

function fmtMinutes(seconds: number) {
  const m = Math.round(seconds / 60);
  return m <= 1 ? "1 min" : `${m} min`;
}

const DIFFICULTY_LABEL: Record<string, string> = {
  facil: "Fácil",
  medio: "Médio",
  dificil: "Difícil",
};

function RewardsPage() {
  const { isAdmin } = useAuth();
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Gift className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Central de Recompensas</h1>
          <p className="text-muted-foreground">
            Aprenda lendo conteúdos educacionais e ganhe créditos ao concluir o quiz.
          </p>
        </div>
      </header>

      {isAdmin ? (
        <Tabs defaultValue="missions">
          <TabsList>
            <TabsTrigger value="missions">
              <BookOpen className="mr-1.5 h-4 w-4" /> Missões
            </TabsTrigger>
            <TabsTrigger value="admin">
              <Settings2 className="mr-1.5 h-4 w-4" /> Administração
            </TabsTrigger>
          </TabsList>
          <TabsContent value="missions" className="mt-6">
            <PlayerView />
          </TabsContent>
          <TabsContent value="admin" className="mt-6">
            <AdminView />
          </TabsContent>
        </Tabs>
      ) : (
        <PlayerView />
      )}
    </div>
  );
}

// =========================================================================
// PLAYER
// =========================================================================

function PlayerView() {
  const fetchData = useServerFn(getRewardData);
  const { refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<RewardConfig | null>(null);
  const [missions, setMissions] = useState<RewardMission[]>([]);
  const [active, setActive] = useState<MissionReader | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchData();
      setConfig(res.config);
      setMissions(res.missions);
    } catch {
      toast.error("Não foi possível carregar as missões.");
    } finally {
      setLoading(false);
    }
  }, [fetchData]);

  useEffect(() => {
    load();
  }, [load]);

  const onCompleted = useCallback(() => {
    setActive(null);
    refreshProfile();
    load();
  }, [load, refreshProfile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando missões...
      </div>
    );
  }

  if (!config?.enabled) {
    return (
      <Card className="flex flex-col items-center gap-3 p-10 text-center">
        <Sparkles className="h-8 w-8 text-primary" />
        <h3 className="text-lg font-semibold">Central de Recompensas indisponível</h3>
        <p className="max-w-md text-sm text-muted-foreground">
          Este recurso está temporariamente desativado. Volte em breve para ganhar créditos
          aprendendo.
        </p>
      </Card>
    );
  }

  if (active) {
    return <MissionReaderView reader={active} onClose={() => setActive(null)} onCompleted={onCompleted} />;
  }

  const remainingMissions = Math.max(0, config.daily_mission_limit - config.today_missions);
  const remainingCredits = Math.max(0, config.daily_credit_limit - config.today_credits);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatBox icon={<Coins className="h-4 w-4" />} label="Créditos hoje" value={`${config.today_credits}/${config.daily_credit_limit}`} />
        <StatBox icon={<Trophy className="h-4 w-4" />} label="Missões hoje" value={`${config.today_missions}/${config.daily_mission_limit}`} />
        <StatBox icon={<ShieldCheck className="h-4 w-4" />} label="Rolagem mínima" value={`${config.min_scroll_percent}%`} />
      </div>

      {remainingMissions === 0 && (
        <Card className="border-primary/30 bg-primary/5 p-4 text-sm">
          Você atingiu o limite diário de missões. Volte amanhã para ganhar mais créditos! 🎉
        </Card>
      )}

      {missions.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <BookOpen className="h-8 w-8 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Nenhuma missão disponível</h3>
          <p className="max-w-md text-sm text-muted-foreground">
            Novas missões de leitura aparecerão aqui automaticamente conforme novos conteúdos
            educacionais forem publicados.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {missions.map((m) => (
            <MissionCard
              key={m.id}
              mission={m}
              disabled={remainingMissions === 0 && !m.completed}
              onStart={setActive}
            />
          ))}
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Créditos restantes hoje: {remainingCredits}
      </p>
    </div>
  );
}

function StatBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold">{value}</p>
      </div>
    </Card>
  );
}

function MissionCard({
  mission,
  disabled,
  onStart,
}: {
  mission: RewardMission;
  disabled: boolean;
  onStart: (r: MissionReader) => void;
}) {
  const open = useServerFn(openMission);
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    try {
      const reader = await open({ data: { missionId: mission.id } });
      onStart(reader);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível abrir a missão.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={`flex flex-col p-5 ${mission.completed ? "opacity-70" : ""}`}>
      <div className="flex flex-wrap items-center gap-2">
        {mission.category && <Badge variant="secondary">{mission.category}</Badge>}
        <Badge variant="outline">{DIFFICULTY_LABEL[mission.difficulty] ?? mission.difficulty}</Badge>
        {mission.completed && (
          <Badge className="gap-1 border-0 bg-green-500/15 text-green-600">
            <CheckCircle2 className="h-3 w-3" /> Concluída
          </Badge>
        )}
      </div>
      <h3 className="mt-3 line-clamp-2 font-semibold">{mission.title}</h3>
      {mission.excerpt && (
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{mission.excerpt}</p>
      )}
      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" /> {fmtMinutes(mission.estimated_read_seconds)}
        </span>
        <span className="flex items-center gap-1 text-primary">
          <Coins className="h-3.5 w-3.5" /> até {mission.credits} créditos
        </span>
      </div>
      <div className="mt-4 flex-1" />
      <Button
        className="mt-2 w-full"
        variant={mission.completed ? "outline" : "default"}
        disabled={mission.completed || disabled || loading}
        onClick={handleStart}
      >
        {loading ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Preparando...</>
        ) : mission.completed ? (
          "Recompensa recebida"
        ) : (
          <><BookOpen className="mr-2 h-4 w-4" /> Iniciar leitura</>
        )}
      </Button>
    </Card>
  );
}

function MissionReaderView({
  reader,
  onClose,
  onCompleted,
}: {
  reader: MissionReader;
  onClose: () => void;
  onCompleted: () => void;
}) {
  const submit = useServerFn(submitMission);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const activeMs = useRef(0);
  const [scrollPercent, setScrollPercent] = useState(0);
  const [reachedEnd, setReachedEnd] = useState(false);
  const [engaged, setEngaged] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);

  const articleOrigin = useMemo(() => {
    try {
      return new URL(reader.url).origin;
    } catch {
      return "";
    }
  }, [reader.url]);

  // Count reading time only while the tab/app is visible (active seconds).
  useEffect(() => {
    let last = Date.now();
    const tick = () => {
      const now = Date.now();
      if (document.visibilityState === "visible") {
        activeMs.current += now - last;
        setSeconds(Math.round(activeMs.current / 1000));
      }
      last = now;
    };
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  // Detect interaction with the cross-origin frame: focusing the iframe blurs
  // the parent window. Combined with active time this is our engagement signal.
  useEffect(() => {
    const onBlur = () => {
      if (document.activeElement === iframeRef.current) setEngaged(true);
    };
    window.addEventListener("blur", onBlur);
    return () => window.removeEventListener("blur", onBlur);
  }, []);

  // Optional precise tracking: the blog (same owner) may post scroll progress.
  // Snippet: window.parent.postMessage({type:'reward-progress',scroll,atEnd},'*')
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (articleOrigin && e.origin !== articleOrigin) return;
      const d = e.data as { type?: string; scroll?: number; atEnd?: boolean } | null;
      if (!d || d.type !== "reward-progress") return;
      if (typeof d.scroll === "number") {
        setScrollPercent((p) => Math.max(p, Math.min(100, Math.round(d.scroll!))));
        setEngaged(true);
      }
      if (d.atEnd) setReachedEnd(true);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [articleOrigin]);

  const minSeconds = Math.floor(reader.estimatedReadSeconds * 0.6);
  // Effective reading progress: precise scroll when available, otherwise an
  // engagement+time estimate (the quiz is the real comprehension gate).
  const timeRatio = Math.min(1, minSeconds > 0 ? seconds / minSeconds : 1);
  const estimatedProgress = engaged ? Math.round(timeRatio * 100) : Math.round(timeRatio * 60);
  const effectiveScroll = Math.max(scrollPercent, reachedEnd ? 100 : estimatedProgress);
  const readingDone =
    effectiveScroll >= reader.minScrollPercent && seconds >= minSeconds && (engaged || reachedEnd || scrollPercent > 0);
  const allAnswered = reader.questions.every((q) => answers[q.id] !== undefined);

  const reasonMessage: Record<string, string> = {
    insufficient_scroll: "Você precisa ler até o final do artigo.",
    too_fast: "Leitura rápida demais. Dedique mais tempo ao conteúdo.",
    low_score: "Você não atingiu a nota mínima. Releia e tente novamente.",
    already_completed: "Você já recebeu a recompensa deste artigo.",
    daily_mission_limit: "Limite diário de missões atingido. Volte amanhã!",
    disabled: "A Central de Recompensas está desativada.",
    mission_not_found: "Missão indisponível.",
    no_quiz: "Quiz indisponível para este artigo.",
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await submit({
        data: {
          missionId: reader.missionId,
          readSeconds: seconds,
          scrollPercent,
          answers: reader.questions.map((q) => ({ id: q.id, answer: answers[q.id] ?? "" })),
        },
      });
      if (res.ok) {
        setResult({
          ok: true,
          message: `Parabéns! Você acertou ${res.correct}/${res.total} e ganhou ${res.creditsAwarded} crédito(s).`,
        });
        toast.success(`+${res.creditsAwarded} créditos!`);
        setTimeout(onCompleted, 2500);
      } else {
        const msg = reasonMessage[res.reason ?? ""] ?? "Não foi possível concluir a missão.";
        setResult({ ok: false, message: msg });
        if (res.reason === "low_score") {
          // allow retry: reset answers
          setAnswers({});
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onClose}>
          ← Voltar
        </Button>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> {seconds}s
          </span>
          <span className="flex items-center gap-1 text-primary">
            <Coins className="h-3.5 w-3.5" /> até {reader.credits} créditos
          </span>
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>Progresso de leitura</span>
          <span>{scrollPercent}% / {reader.minScrollPercent}%</span>
        </div>
        <Progress value={scrollPercent} />
      </div>

      <Card className="p-0">
        <div className="border-b p-4">
          <h2 className="text-lg font-bold">{reader.title}</h2>
          {reader.url && (
            <a
              href={reader.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Ler no blog oficial <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="max-h-[55vh] overflow-y-auto whitespace-pre-wrap p-4 text-sm leading-relaxed text-foreground/90"
        >
          {reader.content}
        </div>
      </Card>

      {!readingDone ? (
        <Card className="border-dashed p-4 text-center text-sm text-muted-foreground">
          <BookOpen className="mx-auto mb-2 h-5 w-5" />
          Continue lendo até o final para liberar o quiz.
        </Card>
      ) : (
        <Card className="space-y-5 p-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Quiz de verificação</h3>
          </div>
          {reader.questions.map((q, qi) => (
            <div key={q.id} className="space-y-2">
              <p className="text-sm font-medium">
                {qi + 1}. {q.question}
              </p>
              <div className="grid gap-2">
                {q.options.map((opt) => {
                  const selected = answers[q.id] === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                      className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                        selected
                          ? "border-primary bg-primary/10"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {result && (
            <div
              className={`rounded-lg p-3 text-sm ${
                result.ok ? "bg-green-500/10 text-green-600" : "bg-destructive/10 text-destructive"
              }`}
            >
              {result.message}
            </div>
          )}

          <Button className="w-full" disabled={!allAnswered || submitting || result?.ok} onClick={handleSubmit}>
            {submitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
            ) : (
              <><CheckCircle2 className="mr-2 h-4 w-4" /> Concluir e resgatar créditos</>
            )}
          </Button>
        </Card>
      )}
    </div>
  );
}

// =========================================================================
// ADMIN
// =========================================================================

function AdminView() {
  const fetchAdmin = useServerFn(getRewardAdminData);
  const saveSettings = useServerFn(updateRewardSettings);
  const sync = useServerFn(syncRewardMissions);
  const setStatus = useServerFn(setMissionStatus);

  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<RewardConfig | null>(null);
  const [missions, setMissions] = useState<RewardAdminMission[]>([]);
  const [stats, setStats] = useState<RewardAdminStats | null>(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAdmin();
      setConfig(res.config);
      setMissions(res.missions);
      setStats(res.stats);
    } catch {
      toast.error("Falha ao carregar o painel administrativo.");
    } finally {
      setLoading(false);
    }
  }, [fetchAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  const update = (patch: Partial<RewardConfig>) =>
    setConfig((c) => (c ? { ...c, ...patch } : c));

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await saveSettings({
        data: {
          enabled: config.enabled,
          content_source: config.content_source,
          blog_url: config.blog_url,
          auto_approve: config.auto_approve,
          credits_per_article: config.credits_per_article,
          daily_credit_limit: config.daily_credit_limit,
          daily_mission_limit: config.daily_mission_limit,
          min_scroll_percent: config.min_scroll_percent,
          seconds_per_100_words: config.seconds_per_100_words,
          pass_threshold: config.pass_threshold,
        },
      });
      toast.success("Configurações salvas.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await sync();
      toast.success(`Sincronização concluída: ${res.imported} novo(s) de ${res.scanned} encontrados.`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha na sincronização.");
    } finally {
      setSyncing(false);
    }
  };

  const handleStatus = async (id: string, status: "approved" | "rejected") => {
    try {
      await setStatus({ data: { id, status } });
      setMissions((ms) => ms.map((m) => (m.id === id ? { ...m, status } : m)));
    } catch {
      toast.error("Erro ao atualizar a missão.");
    }
  };

  if (loading || !config) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando...
      </div>
    );
  }

  const numField = (label: string, key: keyof RewardConfig, hint?: string) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        value={Number(config[key])}
        onChange={(e) => update({ [key]: Number(e.target.value) } as Partial<RewardConfig>)}
      />
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Estatísticas</h3>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Metric label="Missões" value={stats.total_missions} />
            <Metric label="Conclusões" value={stats.total_completions} />
            <Metric label="Créditos distribuídos" value={stats.credits_distributed} />
            <Metric label="Participantes" value={stats.participants} />
            <Metric label="Nota média" value={`${stats.avg_score}%`} />
            <Metric label="Tempo médio" value={fmtMinutes(stats.avg_read_seconds)} />
            <Metric label="Taxa de conclusão" value={`${stats.completion_rate}%`} />
            <Metric label="Pendentes" value={stats.pending_missions} />
          </div>
          {stats.top_missions.length > 0 && (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold text-muted-foreground">Mais lidas</p>
                <ul className="space-y-1 text-sm">
                  {stats.top_missions.map((t) => (
                    <li key={t.title} className="flex justify-between gap-2">
                      <span className="truncate">{t.title}</span>
                      <span className="shrink-0 text-muted-foreground">{t.read_count} leituras</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold text-muted-foreground">Usuários mais ativos</p>
                <ul className="space-y-1 text-sm">
                  {stats.top_users.map((u) => (
                    <li key={u.email} className="flex justify-between gap-2">
                      <span className="truncate">{u.email}</span>
                      <span className="shrink-0 text-muted-foreground">{u.completions} missões</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Settings */}
      <Card className="space-y-5 p-5">
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Configurações</h3>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Central de Recompensas ativa</p>
            <p className="text-xs text-muted-foreground">Liga ou desliga o recurso para os usuários.</p>
          </div>
          <Switch checked={config.enabled} onCheckedChange={(v) => update({ enabled: v })} />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Aprovar conteúdos automaticamente</p>
            <p className="text-xs text-muted-foreground">
              Se desligado, novos artigos importados ficam pendentes de aprovação.
            </p>
          </div>
          <Switch checked={config.auto_approve} onCheckedChange={(v) => update({ auto_approve: v })} />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Fonte de Conteúdo das Recompensas</Label>
          <div className="flex gap-2">
            {(["official", "manual"] as const).map((src) => (
              <Button
                key={src}
                type="button"
                size="sm"
                variant={config.content_source === src ? "default" : "outline"}
                onClick={() => update({ content_source: src })}
              >
                {src === "official" ? "Blog Oficial" : "Manual"}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">URL do blog oficial</Label>
          <Input value={config.blog_url} onChange={(e) => update({ blog_url: e.target.value })} />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {numField("Créditos por artigo", "credits_per_article")}
          {numField("Limite diário de créditos", "daily_credit_limit")}
          {numField("Limite diário de missões", "daily_mission_limit")}
          {numField("Rolagem mínima (%)", "min_scroll_percent")}
          {numField("Segundos por 100 palavras", "seconds_per_100_words", "Tempo de leitura proporcional")}
          {numField("Nota mínima do quiz (%)", "pass_threshold")}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar configurações
          </Button>
          <Button variant="outline" onClick={handleSync} disabled={syncing}>
            {syncing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Sincronizar blog agora
          </Button>
        </div>
      </Card>

      {/* Missions management */}
      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Conteúdos importados ({missions.length})</h3>
        </div>
        {missions.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhum conteúdo importado. Use "Sincronizar blog agora".
          </p>
        ) : (
          <div className="space-y-2">
            {missions.map((m) => (
              <div
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    {m.category && <span>{m.category}</span>}
                    <span>{DIFFICULTY_LABEL[m.difficulty] ?? m.difficulty}</span>
                    <span>{m.word_count} palavras</span>
                    <span>{m.credits} créditos</span>
                    <span>{m.completion_count} conclusões</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    className={`border-0 ${
                      m.status === "approved"
                        ? "bg-green-500/15 text-green-600"
                        : m.status === "pending"
                          ? "bg-amber-500/15 text-amber-600"
                          : "bg-destructive/15 text-destructive"
                    }`}
                  >
                    {m.status === "approved" ? "Aprovado" : m.status === "pending" ? "Pendente" : "Reprovado"}
                  </Badge>
                  {m.status !== "approved" && (
                    <Button size="sm" variant="outline" onClick={() => handleStatus(m.id, "approved")}>
                      Aprovar
                    </Button>
                  )}
                  {m.status !== "rejected" && (
                    <Button size="sm" variant="ghost" onClick={() => handleStatus(m.id, "rejected")}>
                      Reprovar
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}
