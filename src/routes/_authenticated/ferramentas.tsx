import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Crown, Lock, Wrench, ArrowRight, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { EmbeddedBlogView } from "@/components/EmbeddedBlogView";
import { PREMIUM_PAGES, type PremiumPage } from "@/lib/premium-tools";

export const Route = createFileRoute("/_authenticated/ferramentas")({
  head: () => ({
    meta: [
      { title: "Ferramentas Premium — BlogAI Pro" },
      {
        name: "description",
        content:
          "Acesse ferramentas exclusivas do blog oficial diretamente no BlogAI Pro. Recurso exclusivo para assinantes Premium.",
      },
    ],
  }),
  component: FerramentasPage,
});

function FerramentasPage() {
  const { profile, isAdmin, loading } = useAuth();
  const [active, setActive] = useState<PremiumPage | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando...
      </div>
    );
  }

  const allowed = isAdmin || profile?.plan === "premium";

  if (!allowed) {
    return (
      <div className="mx-auto max-w-2xl py-10">
        <Card className="flex flex-col items-center gap-4 p-8 text-center sm:p-10">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Lock className="h-7 w-7" />
          </div>
          <h2 className="font-display text-2xl font-bold">Ferramentas Premium</h2>
          <p className="max-w-md text-muted-foreground">
            Este é um recurso exclusivo para assinantes Premium. Faça upgrade para acessar uma
            coleção completa de ferramentas diretamente dentro do aplicativo.
          </p>
          <Button asChild variant="hero" size="lg">
            <Link to="/pricing">
              <Crown className="h-4 w-4" /> Fazer upgrade para Premium
            </Link>
          </Button>
        </Card>
      </div>
    );
  }

  if (active) {
    return <EmbeddedBlogView page={active} onClose={() => setActive(null)} />;
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 overflow-x-hidden">
      <header className="flex min-w-0 items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Wrench className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold md:text-3xl">Ferramentas Premium</h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Ferramentas exclusivas do blog oficial, sempre atualizadas, dentro do app.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {PREMIUM_PAGES.map((page) => (
          <Card key={page.slug} className="flex min-w-0 flex-col p-5">
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 shrink-0 text-primary" />
              <h3 className="min-w-0 break-words font-semibold">{page.title}</h3>
            </div>
            <p className="mt-2 flex-1 break-words text-sm text-muted-foreground">{page.description}</p>
            <Button className="mt-4 w-full" onClick={() => setActive(page)}>
              Abrir ferramenta <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
