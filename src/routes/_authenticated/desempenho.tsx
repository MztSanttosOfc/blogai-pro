import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  BarChart3,
  MousePointerClick,
  Eye,
  Percent,
  Gauge,
  Loader2,
  Info,
  Globe,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Stethoscope,
  ShieldCheck,
  LifeBuoy,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import {
  getSeoPerformance,
  type SeoTableRow,
  type SeoTotals,
  type SeoSeriesPoint,
  type SeoDiagnosticStep,
} from "@/lib/seo-performance.functions";

export const Route = createFileRoute("/_authenticated/desempenho")({
  head: () => ({
    meta: [
      { title: "Desempenho SEO — BlogAI Pro" },
      {
        name: "description",
        content:
          "Painel de Search Console integrado: cliques, impressões, CTR, posição, páginas, consultas, países e dispositivos do seu blog.",
      },
    ],
  }),
  component: SeoPage,
});

const PERIODS = [
  { value: "7", label: "Últimos 7 dias" },
  { value: "28", label: "Últimos 28 dias" },
  { value: "90", label: "Últimos 3 meses" },
  { value: "180", label: "Últimos 6 meses" },
  { value: "365", label: "Últimos 12 meses" },
] as const;

const COUNTRY_NAMES: Record<string, string> = {
  bra: "Brasil",
  usa: "Estados Unidos",
  prt: "Portugal",
  esp: "Espanha",
  arg: "Argentina",
  mex: "México",
  gbr: "Reino Unido",
  fra: "França",
  deu: "Alemanha",
  ita: "Itália",
  ind: "Índia",
  can: "Canadá",
  ago: "Angola",
  moz: "Moçambique",
  col: "Colômbia",
  chl: "Chile",
  jpn: "Japão",
};

const DEVICE_NAMES: Record<string, string> = {
  DESKTOP: "Desktop",
  MOBILE: "Celular",
  TABLET: "Tablet",
};

function fmtInt(n: number): string {
  return new Intl.NumberFormat("pt-BR").format(Math.round(n));
}

function DeltaBadge({
  current,
  previous,
  invert = false,
}: {
  current: number;
  previous: number | undefined;
  invert?: boolean;
}) {
  if (previous === undefined || previous === null) return null;
  const diff = current - previous;
  const pct = previous !== 0 ? (diff / previous) * 100 : current > 0 ? 100 : 0;
  if (Math.abs(pct) < 0.05) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" /> 0%
      </span>
    );
  }
  // For position, a lower value is better, so invert the "good" direction.
  const good = invert ? diff < 0 : diff > 0;
  const Icon = diff > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${
        good ? "text-emerald-500" : "text-red-500"
      }`}
    >
      <Icon className="h-3 w-3" />
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

function StatBox({
  icon: Icon,
  label,
  value,
  current,
  previous,
  invert,
}: {
  icon: typeof Eye;
  label: string;
  value: string;
  current: number;
  previous?: number;
  invert?: boolean;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="h-4 w-4 text-primary" />
          <span className="text-xs">{label}</span>
        </div>
        <DeltaBadge current={current} previous={previous} invert={invert} />
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </Card>
  );
}

function DataTable({
  rows,
  label,
  format,
  showDelta,
}: {
  rows: SeoTableRow[];
  label: string;
  format?: (key: string) => string;
  showDelta?: boolean;
}) {
  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Sem dados no período.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="py-2 pr-2">{label}</th>
            {showDelta && <th className="py-2 px-2 text-right">Δ Cliques</th>}
            <th className="py-2 px-2 text-right">Cliques</th>
            <th className="py-2 px-2 text-right">Impr.</th>
            <th className="py-2 px-2 text-right">CTR</th>
            <th className="py-2 pl-2 text-right">Pos.</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-border/50">
              <td className="max-w-[240px] truncate py-2 pr-2" title={r.key}>
                {format ? format(r.key) : r.key}
              </td>
              {showDelta && (
                <td className="py-2 px-2 text-right">
                  <span
                    className={
                      (r.deltaClicks ?? 0) > 0
                        ? "text-emerald-500"
                        : (r.deltaClicks ?? 0) < 0
                          ? "text-red-500"
                          : "text-muted-foreground"
                    }
                  >
                    {(r.deltaClicks ?? 0) > 0 ? "+" : ""}
                    {fmtInt(r.deltaClicks ?? 0)}
                  </span>
                </td>
              )}
              <td className="py-2 px-2 text-right">{fmtInt(r.clicks)}</td>
              <td className="py-2 px-2 text-right">{fmtInt(r.impressions)}</td>
              <td className="py-2 px-2 text-right">{(r.ctr * 100).toFixed(1)}%</td>
              <td className="py-2 pl-2 text-right">{r.position.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const DIAG_ICON = {
  ok: CheckCircle2,
  warn: AlertTriangle,
  fail: XCircle,
  skip: Minus,
} as const;

const DIAG_COLOR = {
  ok: "text-emerald-500",
  warn: "text-amber-500",
  fail: "text-red-500",
  skip: "text-muted-foreground",
} as const;

function DiagnosticsPanel({ steps }: { steps: SeoDiagnosticStep[] }) {
  const [open, setOpen] = useState(false);
  if (!steps || steps.length === 0) return null;
  const failing = steps.filter((s) => s.status === "fail").length;
  const warning = steps.filter((s) => s.status === "warn").length;
  const summary =
    failing > 0
      ? `${failing} problema(s) identificado(s)`
      : warning > 0
        ? `${warning} aviso(s)`
        : "Todos os testes passaram";
  return (
    <Card className="p-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 p-4 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Stethoscope className="h-4 w-4 text-primary" />
          Diagnóstico automático
        </span>
        <span
          className={`text-xs font-medium ${
            failing > 0 ? "text-red-500" : warning > 0 ? "text-amber-500" : "text-emerald-500"
          }`}
        >
          {summary} {open ? "▲" : "▼"}
        </span>
      </button>
      {open && (
        <ul className="space-y-3 border-t border-border p-4">
          {steps.map((s) => {
            const Icon = DIAG_ICON[s.status];
            return (
              <li key={s.id} className="flex items-start gap-2">
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${DIAG_COLOR[s.status]}`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{s.label}</p>
                  <p className="text-xs text-muted-foreground">{s.detail}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

type Grouping = "day" | "week" | "month";

function aggregateSeries(series: SeoSeriesPoint[], grouping: Grouping): SeoSeriesPoint[] {
  if (grouping === "day") return series;
  const buckets = new Map<string, { clicks: number; impressions: number; label: string }>();
  for (const p of series) {
    const d = new Date(p.date);
    let key: string;
    if (grouping === "week") {
      const onejan = new Date(d.getFullYear(), 0, 1);
      const week = Math.ceil(
        ((d.getTime() - onejan.getTime()) / 86_400_000 + onejan.getDay() + 1) / 7,
      );
      key = `${d.getFullYear()}-S${String(week).padStart(2, "0")}`;
    } else {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    }
    const b = buckets.get(key) ?? { clicks: 0, impressions: 0, label: key };
    b.clicks += p.clicks;
    b.impressions += p.impressions;
    buckets.set(key, b);
  }
  return Array.from(buckets.values()).map((b) => ({
    date: b.label,
    clicks: b.clicks,
    impressions: b.impressions,
    ctr: 0,
    position: 0,
  }));
}

function SeoPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<string>("28");
  const [blogId, setBlogId] = useState<string | undefined>(undefined);
  const [grouping, setGrouping] = useState<Grouping>("day");
  const [refreshKey, setRefreshKey] = useState(0);
  const perfFn = useServerFn(getSeoPerformance);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["seo-performance", user?.id, period, blogId, refreshKey],
    queryFn: () =>
      perfFn({
        data: { days: Number(period), blogId, refresh: refreshKey > 0 },
      }),
    enabled: !!user,
    staleTime: 3 * 60 * 60 * 1000,
  });

  const totals: SeoTotals | undefined = data?.totals;
  const prev = data?.previous;

  const chartData = useMemo(
    () => aggregateSeries(data?.series ?? [], grouping),
    [data?.series, grouping],
  );

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
    setTimeout(() => refetch(), 0);
  };

  const blogs = data?.blogs ?? [];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold md:text-3xl">Desempenho SEO</h1>
            <p className="text-sm text-muted-foreground">
              Google Search Console integrado ao BlogAI Pro.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {blogs.length > 1 && (
            <Select value={data?.activeBlogId} onValueChange={(v) => setBlogId(v)}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Selecionar blog" />
              </SelectTrigger>
              <SelectContent>
                {blogs.map((b) => (
                  <SelectItem key={b.id} value={b.id} disabled={!b.siteUrl}>
                    {b.name}
                    {!b.siteUrl ? " (sem propriedade)" : !b.verified ? " (não verificado)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isFetching}
            title="Atualizar"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-20 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : !data?.available ? (
        <div className="space-y-4">
          <Card className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">

              {data?.reason === "unverified" ? (
                <ShieldCheck className="h-7 w-7" />
              ) : (
                <Info className="h-7 w-7" />
              )}
            </div>
            <h2 className="text-xl font-bold">
              {data?.reason === "api-disabled"
                ? "Ative a API do Search Console"
                : data?.reason === "no-site"
                  ? "Propriedade não encontrada"
                  : data?.reason === "unverified"
                    ? "Propriedade ainda não verificada"
                    : data?.reason === "scope-missing"
                      ? "Libere o acesso ao Search Console"
                      : data?.reason === "not-connected"
                        ? "Conecte sua conta Google"
                        : data?.reason === "no-permission"
                          ? "Sem permissão nesta propriedade"
                          : "Não foi possível carregar agora"}
            </h2>
            <p className="max-w-md text-muted-foreground">{data?.message}</p>

            {data?.problemSite && (
              <Badge variant="outline" className="font-normal">
                {data.problemSite}
              </Badge>
            )}

            {data?.reason === "api-disabled" && (
              <div className="max-w-md rounded-lg border border-border bg-muted/40 p-4 text-left text-sm text-muted-foreground">
                <p className="mb-2 font-medium text-foreground">Como resolver (leva 1 minuto):</p>
                <ol className="list-decimal space-y-1 pl-4">
                  <li>
                    Abra o{" "}
                    <a
                      href="https://console.cloud.google.com/apis/library/searchconsole.googleapis.com"
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      Google Cloud Console
                    </a>{" "}
                    com a mesma conta Google conectada.
                  </li>
                  <li>
                    Selecione o projeto das suas credenciais e clique em{" "}
                    <span className="font-medium text-foreground">Ativar</span> na API
                    &quot;Google Search Console API&quot;.
                  </li>
                  <li>Aguarde 1–2 minutos e volte aqui para atualizar.</li>
                </ol>
              </div>
            )}

            {(data?.reason === "unverified" || data?.reason === "no-permission") && (
              <div className="max-w-md rounded-lg border border-border bg-muted/40 p-4 text-left text-sm text-muted-foreground">
                <p className="mb-2 font-medium text-foreground">Como resolver:</p>
                <ol className="list-decimal space-y-1 pl-4">
                  <li>
                    Abra o{" "}
                    <a
                      href="https://search.google.com/search-console"
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      Google Search Console
                    </a>{" "}
                    com a mesma conta Google conectada aqui.
                  </li>
                  <li>
                    Selecione a propriedade{" "}
                    <span className="font-medium text-foreground">
                      {data.problemSite ?? "do seu blog"}
                    </span>{" "}
                    e conclua a <span className="font-medium text-foreground">verificação de propriedade</span>.
                  </li>
                  <li>
                    Se a propriedade for de outra pessoa, peça para ela adicionar seu e-mail como
                    usuário em <span className="font-medium text-foreground">Configurações → Usuários e permissões</span>.
                  </li>
                  <li>Depois volte aqui e clique em Atualizar — nenhuma reconexão é necessária.</li>
                </ol>
              </div>
            )}

            {data?.reason === "no-site" && (
              <p className="max-w-md text-sm text-muted-foreground">
                Adicione o site como propriedade no{" "}
                <a
                  href="https://search.google.com/search-console"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  Google Search Console
                </a>{" "}
                usando a mesma conta Google conectada.
              </p>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button variant="outline" onClick={handleRefresh} disabled={isFetching}>
                <RefreshCw className={`mr-1 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
              {(data?.reason === "not-connected" || data?.reason === "scope-missing") && (
                <Button asChild variant="hero">
                  <Link to="/connections">
                    <Globe className="mr-1 h-4 w-4" />
                    {data?.reason === "not-connected"
                      ? "Conectar conta Google"
                      : "Reconectar conta Google"}
                  </Link>
                </Button>
              )}
            </div>
          </Card>

          {blogs.length > 1 && (
            <p className="text-center text-xs text-muted-foreground">
              Dica: use o seletor de blog acima para escolher um blog com propriedade já verificada.
            </p>
          )}

          {data?.diagnostics && <DiagnosticsPanel steps={data.diagnostics} />}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary" className="font-normal">
              {data.siteUrl}
            </Badge>
            {data.range && (
              <span>
                {data.range.startDate} → {data.range.endDate} ({data.range.days} dias)
              </span>
            )}
            {data.cached && <Badge variant="outline">cache</Badge>}
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatBox
              icon={MousePointerClick}
              label="Cliques"
              value={fmtInt(totals?.clicks ?? 0)}
              current={totals?.clicks ?? 0}
              previous={prev?.clicks}
            />
            <StatBox
              icon={Eye}
              label="Impressões"
              value={fmtInt(totals?.impressions ?? 0)}
              current={totals?.impressions ?? 0}
              previous={prev?.impressions}
            />
            <StatBox
              icon={Percent}
              label="CTR médio"
              value={`${((totals?.ctr ?? 0) * 100).toFixed(1)}%`}
              current={totals?.ctr ?? 0}
              previous={prev?.ctr}
            />
            <StatBox
              icon={Gauge}
              label="Posição média"
              value={(totals?.position ?? 0).toFixed(1)}
              current={totals?.position ?? 0}
              previous={prev?.position}
              invert
            />
          </div>

          <Card className="p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Evolução (cliques e impressões)</h3>
              <Tabs value={grouping} onValueChange={(v) => setGrouping(v as Grouping)}>
                <TabsList>
                  <TabsTrigger value="day">Diária</TabsTrigger>
                  <TabsTrigger value="week">Semanal</TabsTrigger>
                  <TabsTrigger value="month">Mensal</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="clicks"
                    name="Cliques"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="impressions"
                    name="Impressões"
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth={1.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Tabs defaultValue="queries">
            <TabsList className="flex-wrap">
              <TabsTrigger value="queries">Consultas</TabsTrigger>
              <TabsTrigger value="pages">Páginas</TabsTrigger>
              <TabsTrigger value="countries">Países</TabsTrigger>
              <TabsTrigger value="devices">Dispositivos</TabsTrigger>
              <TabsTrigger value="appearance">Aparência</TabsTrigger>
              <TabsTrigger value="trends">Tendências</TabsTrigger>
            </TabsList>
            <TabsContent value="queries">
              <Card className="p-4">
                <DataTable rows={data.queries ?? []} label="Palavra-chave" />
              </Card>
            </TabsContent>
            <TabsContent value="pages">
              <Card className="p-4">
                <DataTable rows={data.pages ?? []} label="Página" />
              </Card>
            </TabsContent>
            <TabsContent value="countries">
              <Card className="p-4">
                <DataTable
                  rows={data.countries ?? []}
                  label="País"
                  format={(k) => COUNTRY_NAMES[k] ?? k.toUpperCase()}
                />
              </Card>
            </TabsContent>
            <TabsContent value="devices">
              <Card className="p-4">
                <DataTable
                  rows={data.devices ?? []}
                  label="Dispositivo"
                  format={(k) => DEVICE_NAMES[k] ?? k}
                />
              </Card>
            </TabsContent>
            <TabsContent value="appearance">
              <Card className="p-4">
                {(data.appearance?.length ?? 0) === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Nenhum dado de aparência na pesquisa (Discover, Rich Results, Vídeo) disponível
                    para este período.
                  </p>
                ) : (
                  <DataTable rows={data.appearance ?? []} label="Aparência" />
                )}
              </Card>
            </TabsContent>
            <TabsContent value="trends">
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="p-4">
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-500">
                    <TrendingUp className="h-4 w-4" /> Páginas que mais cresceram
                  </h3>
                  <DataTable rows={data.gainers ?? []} label="Página" showDelta />
                </Card>
                <Card className="p-4">
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-500">
                    <TrendingDown className="h-4 w-4" /> Páginas que perderam tráfego
                  </h3>
                  <DataTable rows={data.losers ?? []} label="Página" showDelta />
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {data.fetchedAt && (
            <p className="text-center text-xs text-muted-foreground">
              Atualizado em {new Date(data.fetchedAt).toLocaleString("pt-BR")} · comparado ao
              período anterior de mesma duração.
            </p>
          )}

          {data.diagnostics && <DiagnosticsPanel steps={data.diagnostics} />}
        </>
      )}
    </div>
  );
}
