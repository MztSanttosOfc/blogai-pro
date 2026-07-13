import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import {
  LifeBuoy,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  SEO_HELP_TOPICS,
  SEO_HELP_ORDER,
  type SeoHelpTopic,
  type SeoHelpTopicId,
  type SeoHelpSeverity,
} from "@/lib/seo-help";

const searchSchema = z.object({
  topic: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/ajuda")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Central de Ajuda — Desempenho SEO — BlogAI Pro" },
      {
        name: "description",
        content:
          "Ajuda passo a passo para conectar o Google Search Console e usar o Painel de Desempenho SEO do BlogAI Pro, sem conhecimento técnico.",
      },
    ],
  }),
  component: HelpPage,
});

const SEVERITY_META: Record<
  SeoHelpSeverity,
  { icon: typeof CheckCircle2; color: string; dot: string; label: string }
> = {
  green: {
    icon: CheckCircle2,
    color: "text-emerald-500",
    dot: "bg-emerald-500",
    label: "Tudo certo",
  },
  yellow: {
    icon: AlertTriangle,
    color: "text-amber-500",
    dot: "bg-amber-500",
    label: "Atenção",
  },
  red: {
    icon: XCircle,
    color: "text-red-500",
    dot: "bg-red-500",
    label: "Ação necessária",
  },
};

function TopicCard({ topic, highlight }: { topic: SeoHelpTopic; highlight: boolean }) {
  const meta = SEVERITY_META[topic.severity];
  const Icon = meta.icon;
  return (
    <Card
      id={topic.id}
      className={`scroll-mt-24 p-5 ${highlight ? "ring-2 ring-primary" : ""}`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${meta.color}`} />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold">{topic.title}</h2>
            <Badge variant="outline" className="gap-1 font-normal">
              <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
              {meta.label}
            </Badge>
            {highlight && (
              <Badge variant="secondary" className="font-normal">
                Situação atual
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{topic.summary}</p>

          {topic.automatic.length > 0 && (
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                O BlogAI Pro faz automaticamente
              </p>
              <ul className="space-y-1 pl-1">
                {topic.automatic.map((a) => (
                  <li key={a} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {topic.steps.length > 0 ? (
            <div>
              <p className="mb-1 text-xs font-medium text-foreground">
                {topic.needsUserAction ? "O que você precisa fazer" : "O que você pode tentar"}
              </p>
              <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                {topic.steps.map((s, i) => (
                  <li key={i}>
                    {s.text}
                    {s.href && (
                      <a
                        href={s.href}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-1 inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        {s.hrefLabel ?? "Abrir"}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              Nenhuma ação necessária. 🎉
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

function HelpPage() {
  const { topic } = Route.useSearch();
  const active =
    topic && topic in SEO_HELP_TOPICS ? (topic as SeoHelpTopicId) : undefined;
  // Show the active topic first, then the rest for reference.
  const order = active
    ? [active, ...SEO_HELP_ORDER.filter((t) => t !== active)]
    : SEO_HELP_ORDER;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <LifeBuoy className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold md:text-3xl">Central de Ajuda</h1>
          <p className="text-sm text-muted-foreground">
            Como conectar o Google Search Console e resolver cada situação — em linguagem simples.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link to="/desempenho">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Voltar ao Desempenho SEO
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to="/connections">Blogger / Conexões</Link>
        </Button>
      </div>

      {active && (
        <Card className="border-primary/40 bg-primary/5 p-4 text-sm text-muted-foreground">
          Mostrando primeiro a instrução relacionada à situação detectada agora no seu painel.
        </Card>
      )}

      <div className="space-y-4">
        {order.map((id) => (
          <TopicCard key={id} topic={SEO_HELP_TOPICS[id]} highlight={id === active} />
        ))}
      </div>
    </div>
  );
}
