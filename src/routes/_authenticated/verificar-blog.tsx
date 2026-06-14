import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { ShieldCheck, CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { PremiumGate } from "@/components/PremiumGate";
import { analyzeBlog, type BlogCheckItem } from "@/lib/blog-check.functions";

export const Route = createFileRoute("/_authenticated/verificar-blog")({
  head: () => ({ meta: [{ title: "Verificar Meu Blog — BlogAI Pro" }] }),
  component: () => (
    <PremiumGate
      title="Verificar Meu Blog"
      description="Analise a estrutura do seu blog (páginas obrigatórias, SEO e conteúdo) com o plano Premium."
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
            Análise orientativa da estrutura, SEO e conteúdo do seu blog.
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
          Esta análise é orientativa e não garante aprovação em programas de monetização.
        </p>
      </Card>

      {result && (
        <div className="space-y-6">
          <Card className="space-y-3 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Pontuação geral</h2>
              <span className="font-display text-3xl font-bold text-primary">
                {result.score}%
              </span>
            </div>
            <Progress value={result.score} />
          </Card>

          <Card className="divide-y p-0">
            {result.items.map((item) => (
              <div key={item.label} className="flex items-start gap-3 p-4">
                {item.ok ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                ) : (
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                )}
                <div>
                  <p className="font-medium">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.detail}</p>
                </div>
              </div>
            ))}
          </Card>

          {result.recommendations.length > 0 && (
            <Card className="space-y-3 p-6">
              <h2 className="text-lg font-semibold">Recomendações</h2>
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
