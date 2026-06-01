import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText, Send, Coins, Crown, Sparkles, ArrowRight } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { PLAN_LABELS } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { user, profile } = useAuth();

  const { data: articles = [] } = useQuery({
    queryKey: ["articles", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("articles")
        .select("id, title, status, created_at, keyword")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const total = articles.length;
  const published = articles.filter((a) => a.status === "published").length;
  const isUnlimited = profile?.plan === "premium";

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold md:text-3xl">
          Olá, {profile?.full_name?.split(" ")[0] ?? "blogueiro"} 👋
        </h1>
        <p className="text-muted-foreground">
          Aqui está um resumo da sua produção de conteúdo.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Artigos gerados" value={total} icon={FileText} accent="primary" />
        <StatCard label="Artigos publicados" value={published} icon={Send} accent="success" />
        <StatCard
          label="Créditos disponíveis"
          value={isUnlimited ? "∞" : (profile?.credits ?? 0)}
          icon={Coins}
          accent="warning"
        />
        <StatCard
          label="Seu plano"
          value={PLAN_LABELS[profile?.plan ?? "free"]}
          icon={Crown}
          accent="chart"
        />
      </div>

      <Card className="relative overflow-hidden bg-gradient-hero p-6 text-sidebar-foreground md:p-8">
        <div className="absolute inset-0 bg-gradient-glow" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="max-w-lg space-y-2">
            <Badge className="bg-primary/20 text-primary hover:bg-primary/20">
              <Sparkles className="mr-1 h-3 w-3" /> Gerador com IA
            </Badge>
            <h2 className="text-xl font-bold text-white md:text-2xl">
              Crie um artigo otimizado para SEO em segundos
            </h2>
            <p className="text-sm text-white/70">
              Informe a palavra-chave e a IA gera título, meta descrição, headings, FAQ e tags.
            </p>
          </div>
          <Button asChild variant="hero" size="lg">
            <Link to="/generate">
              Gerar artigo <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Artigos recentes</h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/library">Ver todos</Link>
          </Button>
        </div>
        {articles.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 p-10 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Você ainda não gerou nenhum artigo. Que tal começar agora?
            </p>
            <Button asChild variant="hero">
              <Link to="/generate">Criar primeiro artigo</Link>
            </Button>
          </Card>
        ) : (
          <div className="space-y-2">
            {articles.slice(0, 5).map((a) => (
              <Link key={a.id} to="/library/$id" params={{ id: a.id }}>
                <Card className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-muted/50">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{a.title || a.keyword}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <Badge variant={a.status === "published" ? "default" : "secondary"}>
                    {a.status === "published" ? "Publicado" : "Rascunho"}
                  </Badge>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
