import { createFileRoute } from "@tanstack/react-router";
import { Rocket, Star, History, Sparkles, CalendarClock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  UPCOMING_UPDATES,
  RELEASED_UPDATES,
  STATUS_META,
  type RoadmapEntry,
} from "@/lib/roadmap";

export const Route = createFileRoute("/_authenticated/atualizacoes")({
  head: () => ({
    meta: [
      { title: "Atualizações Futuras — BlogAI Pro" },
      {
        name: "description",
        content:
          "Acompanhe as próximas atualizações planejadas e o histórico de melhorias do BlogAI Pro.",
      },
    ],
  }),
  component: UpdatesPage,
});

function formatDate(iso?: string) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function UpdateCard({ entry }: { entry: RoadmapEntry }) {
  const meta = STATUS_META[entry.status];
  return (
    <Card
      className={`relative overflow-hidden p-5 transition-shadow hover:shadow-md ${
        entry.highlight ? "border-primary/40 ring-1 ring-primary/20" : ""
      }`}
    >
      {entry.highlight && (
        <div className="absolute right-3 top-3 flex items-center gap-1 text-primary">
          <Star className="h-4 w-4 fill-primary" />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={`gap-1.5 border-0 ${meta.badgeClass}`}>
          <span className={`h-2 w-2 rounded-full ${meta.dotClass}`} />
          {meta.label}
        </Badge>
        {entry.eta && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5" />
            {entry.eta}
          </span>
        )}
        {entry.releasedAt && (
          <span className="text-xs text-muted-foreground">
            Liberado em {formatDate(entry.releasedAt)}
          </span>
        )}
      </div>
      <h3 className="mt-3 pr-6 text-base font-semibold">{entry.title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{entry.description}</p>
    </Card>
  );
}

function EmptyState() {
  return (
    <Card className="flex flex-col items-center justify-center gap-3 p-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Sparkles className="h-7 w-7" />
      </div>
      <h3 className="text-lg font-semibold">Nenhuma atualização pendente no momento</h3>
      <p className="max-w-md text-sm text-muted-foreground">
        Estamos trabalhando em novas melhorias para o BlogAI Pro. Volte em breve
        para conferir as novidades.
      </p>
    </Card>
  );
}

function UpdatesPage() {
  const hasUpcoming = UPCOMING_UPDATES.length > 0;
  const hasReleased = RELEASED_UPDATES.length > 0;

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Rocket className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Atualizações Futuras</h1>
          <p className="text-muted-foreground">
            Acompanhe o que vem por aí e o histórico de melhorias do BlogAI Pro.
          </p>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Próximas atualizações</h2>
        </div>
        {hasUpcoming ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {UPCOMING_UPDATES.map((e) => (
              <UpdateCard key={e.id} entry={e} />
            ))}
          </div>
        ) : (
          <EmptyState />
        )}
      </section>

      {hasReleased && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Atualizações já liberadas</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {RELEASED_UPDATES.map((e) => (
              <UpdateCard key={e.id} entry={e} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
