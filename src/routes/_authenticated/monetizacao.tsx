import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Crown, Loader2, Copy, Sparkles, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import { PremiumGate } from "@/components/PremiumGate";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { COURSE_MODULES, ALL_LESSON_KEYS, PAGE_TYPES, type PageTypeId } from "@/lib/course-content";
import { generateRequiredPage } from "@/lib/monetization.functions";

export const Route = createFileRoute("/_authenticated/monetizacao")({
  head: () => ({ meta: [{ title: "Central de Monetização — BlogAI Pro" }] }),
  component: () => (
    <PremiumGate
      title="Central de Monetização"
      description="Aprenda, passo a passo, a preparar seu blog para monetização com o plano Premium."
    >
      <MonetizationPage />
    </PremiumGate>
  ),
});

function MonetizationPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: completed = new Set<string>() } = useQuery({
    queryKey: ["course-progress", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("course_progress")
        .select("lesson_key")
        .eq("completed", true);
      return new Set((data ?? []).map((r) => r.lesson_key));
    },
    enabled: !!user,
  });

  const toggleLesson = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: boolean }) => {
      if (!user) return;
      if (value) {
        await supabase
          .from("course_progress")
          .upsert({ user_id: user.id, lesson_key: key, completed: true }, { onConflict: "user_id,lesson_key" });
      } else {
        await supabase
          .from("course_progress")
          .delete()
          .eq("user_id", user.id)
          .eq("lesson_key", key);
      }
    },
    onMutate: async ({ key, value }) => {
      await queryClient.cancelQueries({ queryKey: ["course-progress", user?.id] });
      const prev = queryClient.getQueryData<Set<string>>(["course-progress", user?.id]);
      const next = new Set(prev ?? []);
      if (value) next.add(key);
      else next.delete(key);
      queryClient.setQueryData(["course-progress", user?.id], next);
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["course-progress", user?.id], ctx.prev);
      toast.error("Não foi possível salvar o progresso.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["course-progress", user?.id] });
    },
  });

  const totalLessons = ALL_LESSON_KEYS.length;
  const doneCount = ALL_LESSON_KEYS.filter((k) => completed.has(k)).length;
  const overall = totalLessons ? Math.round((doneCount / totalLessons) * 100) : 0;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Crown className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Central de Monetização</h1>
          <p className="text-muted-foreground">
            Um guia prático para deixar seu blog profissional e pronto para monetizar.
          </p>
        </div>
      </div>

      <Card className="space-y-3 bg-muted/30 p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Seu progresso</span>
          <span className="text-sm text-muted-foreground">
            {doneCount}/{totalLessons} concluídos
          </span>
        </div>
        <Progress value={overall} />
      </Card>

      <Card className="flex items-start gap-3 border-warning/40 bg-warning/5 p-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
        <p className="text-sm text-muted-foreground">
          Estas são recomendações educativas. Não garantimos aprovação no Google AdSense
          ou em qualquer programa de monetização — a decisão é sempre das plataformas.
        </p>
      </Card>

      <Accordion type="multiple" className="space-y-3">
        {COURSE_MODULES.map((mod) => {
          const modDone = mod.lessons.filter((l) => completed.has(l.key)).length;
          return (
            <AccordionItem
              key={mod.id}
              value={mod.id}
              className="overflow-hidden rounded-xl border bg-card"
            >
              <AccordionTrigger className="px-5 hover:no-underline">
                <div className="flex flex-1 items-center gap-3 text-left">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                    {mod.number}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{mod.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{mod.summary}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {modDone}/{mod.lessons.length}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 px-5 pb-5">
                {mod.topics.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {mod.topics.map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  {mod.lessons.map((lesson) => (
                    <label
                      key={lesson.key}
                      className="flex cursor-pointer items-start gap-3 rounded-lg p-2 hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={completed.has(lesson.key)}
                        onCheckedChange={(v) =>
                          toggleLesson.mutate({ key: lesson.key, value: v === true })
                        }
                      />
                      <span className="text-sm">{lesson.text}</span>
                    </label>
                  ))}
                </div>

                {mod.hasPageGenerator && <PageGenerator />}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}

function PageGenerator() {
  const generate = useServerFn(generateRequiredPage);
  const [pageType, setPageType] = useState<PageTypeId>("privacy");
  const [blogName, setBlogName] = useState("");
  const [blogUrl, setBlogUrl] = useState("");
  const [email, setEmail] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      generate({ data: { pageType, blogName, blogUrl, email } }),
    onError: (e: Error) => toast.error(e.message || "Falha ao gerar a página."),
  });

  const result = mutation.data as { label: string; content: string } | undefined;

  const copy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.content);
    toast.success("Conteúdo copiado!");
  };

  const handleGenerate = () => {
    if (!blogName.trim() || !blogUrl.trim() || !email.trim()) {
      toast.error("Preencha o nome do blog, a URL e o e-mail.");
      return;
    }
    mutation.mutate();
  };

  return (
    <Card className="space-y-4 border-primary/30 bg-primary/5 p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">Gerador de páginas obrigatórias</h3>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Tipo de página</Label>
          <div className="flex flex-wrap gap-2">
            {PAGE_TYPES.map((p) => (
              <Button
                key={p.id}
                type="button"
                size="sm"
                variant={pageType === p.id ? "default" : "outline"}
                onClick={() => setPageType(p.id)}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="blogName">Nome do blog</Label>
          <Input id="blogName" value={blogName} onChange={(e) => setBlogName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="blogUrl">URL do blog</Label>
          <Input id="blogUrl" value={blogUrl} onChange={(e) => setBlogUrl(e.target.value)} placeholder="https://seublog.com" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail de contato</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </div>

      <Button onClick={handleGenerate} variant="hero" disabled={mutation.isPending}>
        {mutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Gerando...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" /> Gerar página
          </>
        )}
      </Button>

      {result && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{result.label}</span>
            <Button size="sm" variant="outline" onClick={copy}>
              <Copy className="h-3.5 w-3.5" /> Copiar
            </Button>
          </div>
          <Textarea value={result.content} readOnly rows={14} className="font-mono text-xs" />
        </div>
      )}
    </Card>
  );
}
