import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  Network,
  Sparkles,
  Loader2,
  Save,
  Trash2,
  Target,
  FileText,
  Link2,
  KeyRound,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import {
  generateCluster,
  saveCluster,
  listClusters,
  deleteCluster,
  type GeneratedCluster,
} from "@/lib/clusters.functions";

export const Route = createFileRoute("/_authenticated/clusters")({
  head: () => ({
    meta: [
      { title: "Clusters de Conteúdo — BlogAI Pro" },
      {
        name: "description",
        content:
          "Planeje clusters de conteúdo com página pilar, artigos satélites, palavras-chave e links internos gerados por IA.",
      },
    ],
  }),
  component: ClustersPage,
});

function ClusterView({ c }: { c: GeneratedCluster }) {
  return (
    <div className="space-y-5">
      <Card className="border-primary/40 p-5 ring-1 ring-primary/20">
        <div className="flex items-center gap-2 text-primary">
          <Target className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-wide">Página Pilar</span>
        </div>
        <h3 className="mt-2 break-words text-lg font-bold">{c.pillar.title}</h3>
        <p className="mt-1 break-words text-sm text-muted-foreground">{c.pillar.description}</p>
        {c.pillar.keyword && (
          <Badge className="mt-3 border-0 bg-primary/15 text-primary">{c.pillar.keyword}</Badge>
        )}
      </Card>

      <div>
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <FileText className="h-4 w-4 text-primary" /> Artigos satélites ({c.satellites.length})
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {c.satellites.map((s, i) => (
            <Card key={i} className="p-4">
              <h4 className="break-words font-semibold">{s.title}</h4>
              <p className="mt-1 break-words text-xs text-muted-foreground">{s.angle}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {s.keyword && (
                  <Badge variant="secondary" className="text-xs">{s.keyword}</Badge>
                )}
                <Badge variant="outline" className="text-xs">{s.searchIntent}</Badge>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <KeyRound className="h-4 w-4 text-primary" /> Palavras-chave principais
          </div>
          <div className="flex flex-wrap gap-1">
            {c.primaryKeywords.map((k) => (
              <Badge key={k} className="border-0 bg-primary/15 text-primary">{k}</Badge>
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <KeyRound className="h-4 w-4 text-muted-foreground" /> Palavras-chave secundárias
          </div>
          <div className="flex flex-wrap gap-1">
            {c.secondaryKeywords.map((k) => (
              <Badge key={k} variant="secondary" className="text-xs">{k}</Badge>
            ))}
          </div>
        </Card>
      </div>

      {c.internalLinks.length > 0 && (
        <Card className="p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Link2 className="h-4 w-4 text-primary" /> Estrutura de links internos
          </div>
          <ul className="space-y-1.5 text-sm">
            {c.internalLinks.map((l, i) => (
              <li key={i} className="break-words text-muted-foreground">
                <span className="font-medium text-foreground">{l.from}</span> →{" "}
                <span className="font-medium text-foreground">{l.to}</span>
                {l.anchor && <span className="italic"> ({l.anchor})</span>}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function ClustersPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(6);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<GeneratedCluster | null>(null);

  const generateFn = useServerFn(generateCluster);
  const saveFn = useServerFn(saveCluster);
  const listFn = useServerFn(listClusters);
  const deleteFn = useServerFn(deleteCluster);

  const { data: saved = [] } = useQuery({
    queryKey: ["clusters", user?.id],
    queryFn: () => listFn(),
    enabled: !!user,
  });

  const handleGenerate = async () => {
    if (topic.trim().length < 3) {
      toast.error("Informe um tema com pelo menos 3 caracteres.");
      return;
    }
    setGenerating(true);
    setPreview(null);
    try {
      const result = await generateFn({
        data: { topic: topic.trim(), language: "Português", satelliteCount: count },
      });
      setPreview(result);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar cluster.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!preview) return;
    setSaving(true);
    try {
      await saveFn({
        data: {
          topic: preview.topic,
          language: preview.language,
          pillar: preview.pillar,
          satellites: preview.satellites,
          primaryKeywords: preview.primaryKeywords,
          secondaryKeywords: preview.secondaryKeywords,
          internalLinks: preview.internalLinks,
        },
      });
      toast.success("Cluster salvo.");
      queryClient.invalidateQueries({ queryKey: ["clusters", user?.id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteFn({ data: { id } });
      queryClient.invalidateQueries({ queryKey: ["clusters", user?.id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir.");
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <header className="flex min-w-0 items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Network className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold md:text-3xl">Clusters de Conteúdo</h1>
          <p className="text-sm text-muted-foreground">
            Gere a arquitetura completa de um topic cluster antes de criar os artigos.
          </p>
        </div>
      </header>

      <Card className="space-y-4 p-5">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Tema principal</label>
          <Input
            placeholder="Ex.: marketing de conteúdo para pequenas empresas"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Artigos satélites</label>
            <Input
              type="number"
              min={3}
              max={10}
              value={count}
              onChange={(e) => setCount(Math.max(3, Math.min(10, Number(e.target.value) || 6)))}
              className="w-28"
            />
          </div>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-1 h-4 w-4" />
            )}
            Gerar cluster
          </Button>
        </div>
      </Card>

      {preview && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Arquitetura do cluster</h2>
            <Button onClick={handleSave} disabled={saving} variant="outline">
              {saving ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-1 h-4 w-4" />
              )}
              Salvar cluster
            </Button>
          </div>
          <ClusterView c={preview} />
        </div>
      )}

      {saved.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Clusters salvos</h2>
          {saved.map((c) => (
            <Card key={c.id} className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="break-words font-semibold">{c.topic}</h3>
                  <p className="text-xs text-muted-foreground">
                    {c.satellites.length} satélites · {c.primaryKeywords.length} palavras-chave
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => handleDelete(c.id)}
                  aria-label="Excluir"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}
