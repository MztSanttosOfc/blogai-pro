import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  MinusCircle,
  FileText,
  Gauge,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { PremiumGate } from "@/components/PremiumGate";
import { analyzeBlog, type BlogCheckItem } from "@/lib/blog-check.functions";

export const Route = createFileRoute("/_authenticated/verificar-blog")({
  head: () => ({ meta: [{ title: "Verificar Meu Blog — BlogAI Pro" }] }),
  component: () => (
    <PremiumGate
      title="Verificar Meu Blog"
      description="Auditoria SEO profissional do seu blog (estrutura, conteúdo, SEO técnico e performance) com o plano Premium."
    >
      <VerifyBlogPage />
    </PremiumGate>
  ),
});

interface Result {
  score: number;
  items: BlogCheckItem[];
  recommendations: string[];
  finalUrl?: string;
  platform?: string;
  articleCount?: number;
  avgWords?: number;
}

const CATEGORY_ORDER: BlogCheckItem["category"][] = [
  "Estrutura",
  "Conteúdo",
  "SEO Técnico",
  "Performance",
];

function scoreColor(score: number) {
  if (score >= 80) return "text-success";
  if (score >= 50) return "text-warning";
  return "text-destructive";
}

function ItemRow({ item }: { item: BlogCheckItem }) {
  const Icon =
    item.score >= 0.7 ? CheckCircle2 : item.score >= 0.4 ? MinusCircle : XCircle;
  const color =
    item.score >= 0.7
      ? "text-success"
      : item.score >= 0.4
        ? "text-warning"
        : "text-destructive";
  return (
    <div className="flex items-start gap-3 p-4">
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${color}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium">{item.label}</p>
          <span className="shrink-0 text-xs text-muted-foreground">
            peso {item.weight} · {Math.round(item.score * 100)}%
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{item.detail}</p>
      </div>
    </div>
  );
}

function VerifyBlogPage() {
  const [url, setUrl] = useState("");
  const analyze = useServerFn(analyzeBlog);

  const mutation = useMutation({
    mutationFn: (target: string) => analyze({ data: { url: target } }),
    onError: (e: Error) => toast.error(e.message || "Falha ao analisar o blog."),
  });

  const result = mutation.data as Result | undefined;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = url.trim();
    if (!normalized) return;
    mutation.mutate(normalized);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Verificar Meu Blog</h1>
          <p className="text-muted-foreground">
            Auditoria SEO profissional do blog inteiro — não apenas da página inicial.
          </p>
        </div>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
          <Input
            type="text"
            placeholder="https://seublog.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" variant="hero" disabled={mutation.isPending}>
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Analisando...
              </>
            ) : (
              "Analisar blog"
            )}
          </Button>
        </form>
        <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          A análise inspeciona sitemap, artigos recentes, headings, meta tags e mais.
          É orientativa e não garante aprovação em programas de monetização.
        </p>
      </Card>

      {result && (
        <div className="space-y-6">
          <Card className="space-y-3 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Pontuação SEO geral</h2>
              <span className={`font-display text-3xl font-bold ${scoreColor(result.score)}`}>
                {result.score}%
              </span>
            </div>
            <Progress value={result.score} />
            <div className="flex flex-wrap gap-2 pt-1">
              {result.platform && (
                <Badge variant="secondary">Plataforma: {result.platform}</Badge>
              )}
              {typeof result.articleCount === "number" && (
                <Badge variant="secondary" className="gap-1">
                  <FileText className="h-3 w-3" /> {result.articleCount} artigos
                </Badge>
              )}
              {typeof result.avgWords === "number" && (
                <Badge variant="secondary" className="gap-1">
                  <Gauge className="h-3 w-3" /> {result.avgWords} palavras/artigo
                </Badge>
              )}
            </div>
            {result.finalUrl && (
              <p className="text-xs text-muted-foreground">
                Analisado: <span className="break-all">{result.finalUrl}</span>
              </p>
            )}
          </Card>

          {CATEGORY_ORDER.map((cat) => {
            const catItems = result.items.filter((i) => i.category === cat);
            if (catItems.length === 0) return null;
            return (
              <Card key={cat} className="p-0">
                <div className="border-b px-4 py-3">
                  <h3 className="font-semibold">{cat}</h3>
                </div>
                <div className="divide-y">
                  {catItems.map((item) => (
                    <ItemRow key={item.label} item={item} />
                  ))}
                </div>
              </Card>
            );
          })}

          {result.recommendations.length > 0 && (
            <Card className="space-y-3 p-6">
              <h2 className="text-lg font-semibold">Recomendações prioritárias</h2>
              <ul className="space-y-2">
                {result.recommendations.map((r) => (
                  <li key={r} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                    {r}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
