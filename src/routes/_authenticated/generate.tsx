import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sparkles, Loader2, Wand2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { generateArticle } from "@/lib/articles.functions";
import { TONES, LANGUAGES, WORD_COUNTS } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/generate")({
  component: GeneratePage,
});

function GeneratePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { refreshProfile, profile } = useAuth();
  const runGenerate = useServerFn(generateArticle);

  const [keyword, setKeyword] = useState("");
  const [title, setTitle] = useState("");
  const [wordCount, setWordCount] = useState("800");
  const [tone, setTone] = useState<string>("Profissional");
  const [language, setLanguage] = useState<string>("Português");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (keyword.trim().length < 2) {
      toast.error("Informe uma palavra-chave válida.");
      return;
    }
    setLoading(true);
    try {
      const result = await runGenerate({
        data: {
          keyword: keyword.trim(),
          title: title.trim(),
          wordCount: Number(wordCount),
          tone,
          language,
        },
      });
      await refreshProfile();
      await queryClient.invalidateQueries({ queryKey: ["articles"] });
      toast.success("Artigo gerado com sucesso!");
      navigate({ to: "/library/$id", params: { id: result.article.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar o artigo.");
    } finally {
      setLoading(false);
    }
  };

  const noCredits = profile?.plan !== "premium" && (profile?.credits ?? 0) <= 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold md:text-3xl">
          <Wand2 className="h-6 w-6 text-primary" /> Gerador de Artigos com IA
        </h1>
        <p className="text-muted-foreground">
          Preencha os campos e deixe a inteligência artificial escrever para você.
        </p>
      </div>

      <Card className="p-6 shadow-soft">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="keyword">Palavra-chave principal *</Label>
            <Input
              id="keyword"
              placeholder="Ex.: receitas veganas fáceis"
              value={keyword}
              maxLength={120}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Título (opcional)</Label>
            <Input
              id="title"
              placeholder="Deixe em branco para a IA criar"
              value={title}
              maxLength={160}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Quantidade de palavras</Label>
              <Select value={wordCount} onValueChange={setWordCount}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORD_COUNTS.map((w) => (
                    <SelectItem key={w} value={String(w)}>
                      {w} palavras
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tom de escrita</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Idioma</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {noCredits ? (
            <div className="rounded-lg bg-warning/10 p-4 text-sm text-warning-foreground">
              Você não tem créditos suficientes. Faça upgrade do seu plano para continuar gerando.
            </div>
          ) : null}

          <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading || noCredits}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Gerando artigo...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Gerar artigo
              </>
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
}
