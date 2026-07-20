import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trans, useTranslation } from "react-i18next";
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
  const { t } = useTranslation("generate");
  const { profile } = useAuth();
  const noCredits = profile?.plan !== "premium" && (profile?.credits ?? 0) <= 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold md:text-3xl">
          <Wand2 className="h-6 w-6 text-primary" /> {t("title")}
        </h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      {noCredits ? (
        <div className="rounded-lg bg-warning/10 p-4 text-sm text-warning-foreground">
          {t("noCredits")}
        </div>
      ) : null}

      <Tabs defaultValue="smart" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="smart" className="gap-1.5">
            <Brain className="h-4 w-4" /> {t("tabs.smart")}
          </TabsTrigger>
          <TabsTrigger value="auto" className="gap-1.5">
            <Zap className="h-4 w-4" /> {t("tabs.auto")}
          </TabsTrigger>
          <TabsTrigger value="advanced" className="gap-1.5">
            <SlidersHorizontal className="h-4 w-4" /> {t("tabs.advanced")}
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
  const { t } = useTranslation("generate");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { refreshProfile } = useAuth();
  const runGenerate = useServerFn(generateArticle);

  return async (input: GenerateInput) => {
    const result = await runGenerate({ data: input });
    await refreshProfile();
    await queryClient.invalidateQueries({ queryKey: ["articles"] });
    toast.success(t("success"));
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
  const { t } = useTranslation("generate");
  const current = IMAGE_STYLES.find((s) => s.key === value) ?? IMAGE_STYLES[0];
  return (
    <div className="space-y-2">
      <Label>{t("shared.imageStyle")}</Label>
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
      <Trans
        i18nKey="shared.smartProfileHint"
        ns="generate"
        components={{
          1: <a href="/perfil-inteligente" className="font-medium text-primary underline" />,
        }}
      />
    </p>
  );
}

/* -------------------------------------------------------------------------- */
/* Smart mode — analyze topic, review/edit suggestions, then generate         */
/* -------------------------------------------------------------------------- */

function SmartMode({ disabled }: { disabled: boolean }) {
  const { t } = useTranslation("generate");
  const runAnalyze = useServerFn(analyzeTopic);
  const generate = useGenerate();

  const [topic, setTopic] = useState("");
  const [language, setLanguage] = useState<string>("Português");
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [analysis, setAnalysis] = useState<TopicAnalysis | null>(null);

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
      toast.error(t("smart.invalidTopic"));
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
      toast.error(err instanceof Error ? err.message : t("smart.errorAnalyze"));
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
      toast.error(err instanceof Error ? err.message : t("smart.errorGenerate"));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-5">
      <Card className="p-6 shadow-soft">
        <form onSubmit={handleAnalyze} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="topic">{t("smart.topicLabel")}</Label>
            <Input
              id="topic"
              placeholder={t("smart.topicPlaceholder")}
              value={topic}
              maxLength={120}
              onChange={(e) => setTopic(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">{t("smart.topicHint")}</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("shared.language")}</Label>
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
                <Loader2 className="h-4 w-4 animate-spin" /> {t("smart.analyzing")}
              </>
            ) : (
              <>
                <Brain className="h-4 w-4" /> {t("smart.analyze")}
              </>
            )}
          </Button>
        </form>
      </Card>

      {analysis && (
        <Card className="space-y-5 p-6 shadow-soft">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="gap-1">
              <TrendingUp className="h-3 w-3" /> {t("smart.traffic")}: {analysis.trafficPotential}
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Target className="h-3 w-3" /> {t("smart.competition")}: {analysis.competition}
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Search className="h-3 w-3" /> {analysis.searchIntent}
            </Badge>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="smart-keyword">{t("smart.mainKeyword")}</Label>
              <Input
                id="smart-keyword"
                value={keyword}
                maxLength={120}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smart-title">{t("smart.title")}</Label>
              <Input
                id="smart-title"
                value={title}
                maxLength={160}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("shared.tone")}</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONES.map((tv) => (
                    <SelectItem key={tv} value={tv}>
                      {tv}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("smart.recommendedSize")}</Label>
              <Select value={String(wordCount)} onValueChange={(v) => setWordCount(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[...new Set([analysis.recommendedWordCount, ...WORD_COUNTS])]
                    .sort((a, b) => a - b)
                    .map((w) => (
                      <SelectItem key={w} value={String(w)}>
                        {w} {t("smart.wordsSuffix")}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <InfoBlock icon={Users} title={t("smart.audience")}>
            <p className="text-sm text-muted-foreground">{analysis.audience}</p>
          </InfoBlock>

          <InfoBlock icon={TagsIcon} title={t("smart.secondaryKeywords")}>
            <div className="flex flex-wrap gap-1.5">
              {analysis.secondaryKeywords.map((k) => (
                <Badge key={k} variant="outline">
                  {k}
                </Badge>
              ))}
            </div>
          </InfoBlock>

          <InfoBlock icon={ListOrdered} title={t("smart.structure")}>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              {analysis.structure.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </InfoBlock>

          {analysis.faq.length > 0 && (
            <InfoBlock icon={HelpCircle} title={t("smart.faq")}>
              <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                {analysis.faq.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </InfoBlock>
          )}

          {analysis.strategy && (
            <div className="rounded-lg bg-primary/5 p-4 text-sm">
              <span className="font-semibold text-primary">{t("smart.strategy")} </span>
              {analysis.strategy}
            </div>
          )}

          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {analysis.category && (
              <span>
                {t("smart.category")} <strong>{analysis.category}</strong>
              </span>
            )}
            {analysis.slug && (
              <span>
                · {t("smart.slug")} <strong>{analysis.slug}</strong>
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
                <Loader2 className="h-4 w-4 animate-spin" /> {t("smart.generating")}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> {t("smart.generate")}
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
  const { t } = useTranslation("generate");
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
      toast.error(t("auto.invalidTopic"));
      return;
    }
    setLoading(true);
    try {
      setStep(t("auto.step1"));
      const a = await runAnalyze({ data: { topic: topic.trim(), language } });
      setStep(t("auto.step2"));
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
      toast.error(err instanceof Error ? err.message : t("auto.errorGenerate"));
    } finally {
      setLoading(false);
      setStep("");
    }
  };

  return (
    <Card className="p-6 shadow-soft">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-lg bg-primary/5 p-4 text-sm text-muted-foreground">
          <Trans
            i18nKey="auto.banner"
            ns="generate"
            components={{ 0: <strong className="text-primary" /> }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="auto-topic">{t("auto.topicLabel")}</Label>
          <Input
            id="auto-topic"
            placeholder={t("auto.topicPlaceholder")}
            value={topic}
            maxLength={120}
            onChange={(e) => setTopic(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>{t("shared.language")}</Label>
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
              <Loader2 className="h-4 w-4 animate-spin" /> {t("auto.generating")}
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" /> {t("auto.cta")}
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
  const { t } = useTranslation("generate");
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
  const defaultImageStyle = useDefaultImageStyle();
  const [imageStyle, setImageStyle] = useState<ImageStyleKey>(defaultImageStyle);
  useEffect(() => setImageStyle(defaultImageStyle), [defaultImageStyle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (keyword.trim().length < 2) {
      toast.error(t("advanced.invalidKeyword"));
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
        imageStyle,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("advanced.errorGenerate"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 shadow-soft">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="adv-keyword">{t("advanced.keywordLabel")}</Label>
          <Input
            id="adv-keyword"
            placeholder={t("advanced.keywordPlaceholder")}
            value={keyword}
            maxLength={120}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="adv-secondary">{t("advanced.secondaryLabel")}</Label>
          <Textarea
            id="adv-secondary"
            placeholder={t("advanced.secondaryPlaceholder")}
            value={secondary}
            onChange={(e) => setSecondary(e.target.value)}
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="adv-title">{t("advanced.titleLabel")}</Label>
          <Input
            id="adv-title"
            placeholder={t("advanced.titlePlaceholder")}
            value={title}
            maxLength={160}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="adv-audience">{t("advanced.audienceLabel")}</Label>
            <Input
              id="adv-audience"
              placeholder={t("advanced.audiencePlaceholder")}
              value={audience}
              maxLength={200}
              onChange={(e) => setAudience(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adv-objective">{t("advanced.objectiveLabel")}</Label>
            <Input
              id="adv-objective"
              placeholder={t("advanced.objectivePlaceholder")}
              value={objective}
              maxLength={200}
              onChange={(e) => setObjective(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label>{t("advanced.words")}</Label>
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
            <Label>{t("advanced.tone")}</Label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TONES.map((tv) => (
                  <SelectItem key={tv} value={tv}>
                    {tv}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("advanced.language")}</Label>
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
            <Label>{t("advanced.country")}</Label>
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

        <ImageStylePicker value={imageStyle} onChange={setImageStyle} />
        <SmartProfileHint />

        <Button
          type="submit"
          variant="hero"
          size="lg"
          className="w-full"
          disabled={loading || disabled}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> {t("advanced.generating")}
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" /> {t("advanced.cta")}
            </>
          )}
        </Button>
      </form>
    </Card>
  );
}
