import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Sparkles,
  Loader2,
  Wand2,
  Brain,
  Zap,
  SlidersHorizontal,
  Search,
  Target,
  Users,
  TrendingUp,
  Tags as TagsIcon,
  ListOrdered,
  HelpCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { generateArticle, analyzeTopic, type TopicAnalysis } from "@/lib/articles.functions";
import { TONES, LANGUAGES, WORD_COUNTS } from "@/lib/constants";
import { IMAGE_STYLES, DEFAULT_IMAGE_STYLE, type ImageStyleKey } from "@/lib/image-styles";
import { getSmartProfile } from "@/lib/smart-profile.functions";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/generate")({
  component: GeneratePage,
});

const COUNTRIES = [
  "Brasil",
  "Portugal",
  "Estados Unidos",
  "Espanha",
  "México",
  "Reino Unido",
  "Global",
] as const;

function GeneratePage() {
  const { profile } = useAuth();
  const noCredits = profile?.plan !== "premium" && (profile?.credits ?? 0) <= 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold md:text-3xl">
          <Wand2 className="h-6 w-6 text-primary" /> Assistente de Conteúdo com IA
        </h1>
        <p className="text-muted-foreground">
          Da ideia ao artigo pronto para ranquear — escolha o nível de controle que preferir.
        </p>
      </div>

      {noCredits ? (
        <div className="rounded-lg bg-warning/10 p-4 text-sm text-warning-foreground">
          Você não tem créditos suficientes. Faça upgrade do seu plano para continuar gerando.
        </div>
      ) : null}

      <Tabs defaultValue="smart" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="smart" className="gap-1.5">
            <Brain className="h-4 w-4" /> Inteligente
          </TabsTrigger>
          <TabsTrigger value="auto" className="gap-1.5">
            <Zap className="h-4 w-4" /> Automático
          </TabsTrigger>
          <TabsTrigger value="advanced" className="gap-1.5">
            <SlidersHorizontal className="h-4 w-4" /> Avançado
          </TabsTrigger>
        </TabsList>

        <TabsContent value="smart" className="mt-6">
          <SmartMode disabled={noCredits} />
        </TabsContent>
        <TabsContent value="auto" className="mt-6">
          <AutoMode disabled={noCredits} />
        </TabsContent>
        <TabsContent value="advanced" className="mt-6">
          <AdvancedMode disabled={noCredits} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Shared helpers                                                             */
/* -------------------------------------------------------------------------- */

interface GenerateInput {
  keyword: string;
  title?: string;
  wordCount: number;
  tone: string;
  language: string;
  secondaryKeywords?: string[];
  audience?: string;
  searchIntent?: string;
  objective?: string;
  country?: string;
  category?: string;
  slug?: string;
  metaHint?: string;
  structure?: string[];
  imageStyle?: string;
}

function useGenerate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { refreshProfile } = useAuth();
  const runGenerate = useServerFn(generateArticle);

  return async (input: GenerateInput) => {
    const result = await runGenerate({ data: input });
    await refreshProfile();
    await queryClient.invalidateQueries({ queryKey: ["articles"] });
    toast.success("Artigo gerado com sucesso!");
    navigate({ to: "/library/$id", params: { id: result.article.id } });
  };
}

/** Hook: lê o estilo padrão de imagem do Perfil Inteligente (fonte única). */
function useDefaultImageStyle(): ImageStyleKey {
  const fetchSmart = useServerFn(getSmartProfile);
  const q = useQuery({
    queryKey: ["smart-profile", "image-style-default"],
    queryFn: () => fetchSmart(),
    staleTime: 5 * 60 * 1000,
  });
  const key = q.data?.ai_prefs?.preferred_image_style as ImageStyleKey | undefined;
  return key && IMAGE_STYLES.some((s) => s.key === key) ? key : DEFAULT_IMAGE_STYLE;
}

/** Seletor reutilizável de estilo de imagem. */
function ImageStylePicker({
  value,
  onChange,
}: {
  value: ImageStyleKey;
  onChange: (v: ImageStyleKey) => void;
}) {
  const current = IMAGE_STYLES.find((s) => s.key === value) ?? IMAGE_STYLES[0];
  return (
    <div className="space-y-2">
      <Label>Estilo das imagens</Label>
      <Select value={value} onValueChange={(v) => onChange(v as ImageStyleKey)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {IMAGE_STYLES.map((s) => (
            <SelectItem key={s.key} value={s.key}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">{current.description}</p>
    </div>
  );
}

/** Aviso curto informando reutilização automática do Perfil Inteligente. */
function SmartProfileHint() {
  return (
    <p className="rounded-md bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
      <Sparkles className="mr-1 inline h-3 w-3 text-primary" />
      Este artigo usará automaticamente os dados do seu{" "}
      <a href="/perfil-inteligente" className="font-medium text-primary underline">
        Perfil Inteligente
      </a>{" "}
      (autor, tom, links internos, palavras banidas).
    </p>
  );
}

/* -------------------------------------------------------------------------- */
/* Smart mode — analyze topic, review/edit suggestions, then generate         */
/* -------------------------------------------------------------------------- */

function SmartMode({ disabled }: { disabled: boolean }) {
  const runAnalyze = useServerFn(analyzeTopic);
  const generate = useGenerate();

  const [topic, setTopic] = useState("");
  const [language, setLanguage] = useState<string>("Português");
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [analysis, setAnalysis] = useState<TopicAnalysis | null>(null);

  // Editable fields seeded from the analysis.
  const [keyword, setKeyword] = useState("");
  const [title, setTitle] = useState("");
  const [tone, setTone] = useState("Profissional");
  const [wordCount, setWordCount] = useState(1200);
  const defaultImageStyle = useDefaultImageStyle();
  const [imageStyle, setImageStyle] = useState<ImageStyleKey>(defaultImageStyle);
  useEffect(() => setImageStyle(defaultImageStyle), [defaultImageStyle]);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim().length < 2) {
      toast.error("Informe um tema válido.");
      return;
    }
    setAnalyzing(true);
    try {
      const result = await runAnalyze({ data: { topic: topic.trim(), language } });
      setAnalysis(result);
      setKeyword(result.mainKeyword);
      setTitle(result.titleSuggestion);
      setTone(TONES.includes(result.tone as (typeof TONES)[number]) ? result.tone : "Profissional");
      setWordCount(result.recommendedWordCount);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao analisar o tema.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGenerate = async () => {
    if (!analysis) return;
    setGenerating(true);
    try {
      await generate({
        keyword: keyword.trim() || analysis.mainKeyword,
        title: title.trim(),
        wordCount,
        tone,
        language,
        secondaryKeywords: analysis.secondaryKeywords,
        audience: analysis.audience,
        searchIntent: analysis.searchIntent,
        category: analysis.category,
        slug: analysis.slug,
        metaHint: analysis.metaDescription,
        structure: analysis.structure,
        imageStyle,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar o artigo.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-5">
      <Card className="p-6 shadow-soft">
        <form onSubmit={handleAnalyze} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="topic">Qual é o tema do seu artigo?</Label>
            <Input
              id="topic"
              placeholder="Ex.: Cachorros, AdSense, SEO, Marketing Digital..."
              value={topic}
              maxLength={120}
              onChange={(e) => setTopic(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Informe apenas o tema. A IA cuida das palavras-chave, estrutura e SEO para você.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <ImageStylePicker value={imageStyle} onChange={setImageStyle} />
          </div>
          <SmartProfileHint />

          <Button
            type="submit"
            variant="hero"
            size="lg"
            className="w-full"
            disabled={analyzing || disabled}
          >
            {analyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Analisando tema...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4" /> Analisar tema
              </>
            )}
          </Button>
        </form>
      </Card>

      {analysis && (
        <Card className="space-y-5 p-6 shadow-soft">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="gap-1">
              <TrendingUp className="h-3 w-3" /> Tráfego: {analysis.trafficPotential}
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Target className="h-3 w-3" /> Concorrência: {analysis.competition}
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Search className="h-3 w-3" /> {analysis.searchIntent}
            </Badge>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="smart-keyword">Palavra-chave principal</Label>
              <Input
                id="smart-keyword"
                value={keyword}
                maxLength={120}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smart-title">Título</Label>
              <Input
                id="smart-title"
                value={title}
                maxLength={160}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Tom de voz</Label>
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
              <Label>Tamanho recomendado</Label>
              <Select value={String(wordCount)} onValueChange={(v) => setWordCount(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[...new Set([analysis.recommendedWordCount, ...WORD_COUNTS])]
                    .sort((a, b) => a - b)
                    .map((w) => (
                      <SelectItem key={w} value={String(w)}>
                        {w} palavras
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <InfoBlock icon={Users} title="Público-alvo">
            <p className="text-sm text-muted-foreground">{analysis.audience}</p>
          </InfoBlock>

          <InfoBlock icon={TagsIcon} title="Palavras-chave secundárias">
            <div className="flex flex-wrap gap-1.5">
              {analysis.secondaryKeywords.map((k) => (
                <Badge key={k} variant="outline">
                  {k}
                </Badge>
              ))}
            </div>
          </InfoBlock>

          <InfoBlock icon={ListOrdered} title="Estrutura sugerida">
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              {analysis.structure.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </InfoBlock>

          {analysis.faq.length > 0 && (
            <InfoBlock icon={HelpCircle} title="FAQ sugerido">
              <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                {analysis.faq.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </InfoBlock>
          )}

          {analysis.strategy && (
            <div className="rounded-lg bg-primary/5 p-4 text-sm">
              <span className="font-semibold text-primary">Estratégia: </span>
              {analysis.strategy}
            </div>
          )}

          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {analysis.category && (
              <span>
                Categoria: <strong>{analysis.category}</strong>
              </span>
            )}
            {analysis.slug && (
              <span>
                · Slug: <strong>{analysis.slug}</strong>
              </span>
            )}
          </div>

          <Button
            onClick={handleGenerate}
            variant="hero"
            size="lg"
            className="w-full"
            disabled={generating || disabled}
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Gerando artigo...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Gerar artigo com estas sugestões
              </>
            )}
          </Button>
        </Card>
      )}
    </div>
  );
}

function InfoBlock({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Users;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold">
        <Icon className="h-4 w-4 text-primary" /> {title}
      </h3>
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Auto mode — one click does everything                                      */
/* -------------------------------------------------------------------------- */

function AutoMode({ disabled }: { disabled: boolean }) {
  const runAnalyze = useServerFn(analyzeTopic);
  const generate = useGenerate();

  const [topic, setTopic] = useState("");
  const [language, setLanguage] = useState<string>("Português");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("");
  const defaultImageStyle = useDefaultImageStyle();
  const [imageStyle, setImageStyle] = useState<ImageStyleKey>(defaultImageStyle);
  useEffect(() => setImageStyle(defaultImageStyle), [defaultImageStyle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim().length < 2) {
      toast.error("Informe um tema válido.");
      return;
    }
    setLoading(true);
    try {
      setStep("Pesquisando o tema e definindo a estratégia de SEO...");
      const a = await runAnalyze({ data: { topic: topic.trim(), language } });
      setStep("Escrevendo o artigo completo...");
      await generate({
        keyword: a.mainKeyword,
        title: a.titleSuggestion,
        wordCount: a.recommendedWordCount,
        tone: TONES.includes(a.tone as (typeof TONES)[number]) ? a.tone : "Profissional",
        language,
        secondaryKeywords: a.secondaryKeywords,
        audience: a.audience,
        searchIntent: a.searchIntent,
        category: a.category,
        slug: a.slug,
        metaHint: a.metaDescription,
        structure: a.structure,
        imageStyle,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar o artigo.");
    } finally {
      setLoading(false);
      setStep("");
    }
  };

  return (
    <Card className="p-6 shadow-soft">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-lg bg-primary/5 p-4 text-sm text-muted-foreground">
          <strong className="text-primary">Modo Automático:</strong> informe apenas o tema e a IA
          pesquisa, define as palavras-chave, cria a estrutura SEO, FAQ, meta descrição, tags e
          escreve o artigo completo — tudo sozinha.
        </div>
        <div className="space-y-2">
          <Label htmlFor="auto-topic">Tema principal</Label>
          <Input
            id="auto-topic"
            placeholder="Ex.: Como ganhar dinheiro com Blogger"
            value={topic}
            maxLength={120}
            onChange={(e) => setTopic(e.target.value)}
          />
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
        <ImageStylePicker value={imageStyle} onChange={setImageStyle} />
        <SmartProfileHint />
        {loading && step && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> {step}
          </p>
        )}
        <Button
          type="submit"
          variant="hero"
          size="lg"
          className="w-full"
          disabled={loading || disabled}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Gerando...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" /> Gerar Artigo Inteligente
            </>
          )}
        </Button>
      </form>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Advanced mode — full manual control                                        */
/* -------------------------------------------------------------------------- */

function AdvancedMode({ disabled }: { disabled: boolean }) {
  const generate = useGenerate();

  const [keyword, setKeyword] = useState("");
  const [secondary, setSecondary] = useState("");
  const [title, setTitle] = useState("");
  const [audience, setAudience] = useState("");
  const [objective, setObjective] = useState("");
  const [wordCount, setWordCount] = useState("800");
  const [tone, setTone] = useState<string>("Profissional");
  const [language, setLanguage] = useState<string>("Português");
  const [country, setCountry] = useState<string>("Brasil");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (keyword.trim().length < 2) {
      toast.error("Informe uma palavra-chave válida.");
      return;
    }
    setLoading(true);
    try {
      await generate({
        keyword: keyword.trim(),
        title: title.trim(),
        wordCount: Number(wordCount),
        tone,
        language,
        country,
        audience: audience.trim(),
        objective: objective.trim(),
        secondaryKeywords: secondary
          .split(/[,;\n]/)
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 15),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar o artigo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 shadow-soft">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="adv-keyword">Palavra-chave principal *</Label>
          <Input
            id="adv-keyword"
            placeholder="Ex.: receitas veganas fáceis"
            value={keyword}
            maxLength={120}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="adv-secondary">Palavras-chave secundárias</Label>
          <Textarea
            id="adv-secondary"
            placeholder="Separadas por vírgula"
            value={secondary}
            onChange={(e) => setSecondary(e.target.value)}
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="adv-title">Título (opcional)</Label>
          <Input
            id="adv-title"
            placeholder="Deixe em branco para a IA criar"
            value={title}
            maxLength={160}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="adv-audience">Público-alvo</Label>
            <Input
              id="adv-audience"
              placeholder="Ex.: iniciantes em blogs"
              value={audience}
              maxLength={200}
              onChange={(e) => setAudience(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adv-objective">Objetivo do conteúdo</Label>
            <Input
              id="adv-objective"
              placeholder="Ex.: gerar autoridade e tráfego"
              value={objective}
              maxLength={200}
              onChange={(e) => setObjective(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label>Palavras</Label>
            <Select value={wordCount} onValueChange={setWordCount}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WORD_COUNTS.map((w) => (
                  <SelectItem key={w} value={String(w)}>
                    {w}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tom</Label>
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
          <div className="space-y-2">
            <Label>País</Label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          type="submit"
          variant="hero"
          size="lg"
          className="w-full"
          disabled={loading || disabled}
        >
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
  );
}
