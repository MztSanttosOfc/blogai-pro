import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
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
import { useAuth } from "@/hooks/use-auth";
import { getSeoPerformance, type SeoTableRow } from "@/lib/seo-performance.functions";

export const Route = createFileRoute("/_authenticated/desempenho")({
  head: () => ({
    meta: [
      { title: "Desempenho SEO — BlogAI Pro" },
      {
        name: "description",
        content:
          "Acompanhe cliques, impressões, CTR e posição média do seu blog com dados do Google Search Console.",
      },
    ],
  }),
  component: SeoPage,
});

function StatBox({ icon: Icon, label, value }: { icon: typeof Eye; label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4 text-primary" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </Card>
  );
}

function DataTable({ rows, label }: { rows: SeoTableRow[]; label: string }) {
  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Sem dados no período.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="py-2 pr-2">{label}</th>
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
                {r.key}
              </td>
              <td className="py-2 px-2 text-right">{r.clicks}</td>
              <td className="py-2 px-2 text-right">{r.impressions}</td>
              <td className="py-2 px-2 text-right">{(r.ctr * 100).toFixed(1)}%</td>
              <td className="py-2 pl-2 text-right">{r.position.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SeoPage() {
  const { user } = useAuth();
  const [days, setDays] = useState(28);
  const perfFn = useServerFn(getSeoPerformance);

  const { data, isLoading } = useQuery({
    queryKey: ["seo-performance", user?.id, days],
    queryFn: () => perfFn({ data: { days } }),
    enabled: !!user,
  });

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold md:text-3xl">Desempenho SEO</h1>
            <p className="text-sm text-muted-foreground">
              Dados do Google Search Console do seu blog.
            </p>
          </div>
        </div>
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="28">Últimos 28 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-20 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : !data?.available ? (
        <Card className="flex flex-col items-center gap-4 p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Info className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold">Dados indisponíveis</h2>
          <p className="max-w-md text-muted-foreground">{data?.message}</p>
          <Button asChild variant="hero">
            <Link to="/connections">
              <Globe className="mr-1 h-4 w-4" /> Ir para conexão com o Blogger
            </Link>
          </Button>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatBox
              icon={MousePointerClick}
              label="Cliques"
              value={String(data.totals?.clicks ?? 0)}
            />
            <StatBox icon={Eye} label="Impressões" value={String(data.totals?.impressions ?? 0)} />
            <StatBox
              icon={Percent}
              label="CTR médio"
              value={`${((data.totals?.ctr ?? 0) * 100).toFixed(1)}%`}
            />
            <StatBox
              icon={Gauge}
              label="Posição média"
              value={(data.totals?.position ?? 0).toFixed(1)}
            />
          </div>

          <Card className="p-4">
            <h3 className="mb-3 text-sm font-semibold">Evolução (cliques e impressões)</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.series ?? []}>
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
            <TabsList>
              <TabsTrigger value="queries">Palavras-chave</TabsTrigger>
              <TabsTrigger value="pages">Páginas</TabsTrigger>
            </TabsList>
            <TabsContent value="queries">
              <Card className="p-4">
                <DataTable rows={data.queries ?? []} label="Consulta" />
              </Card>
            </TabsContent>
            <TabsContent value="pages">
              <Card className="p-4">
                <DataTable rows={data.pages ?? []} label="Página" />
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
