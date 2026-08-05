import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

const SITE_URL = "https://monzart.com.br";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BlogAI Pro — IA Premium para Blogueiros Profissionais" },
      {
        name: "description",
        content: "Transforme ideias em tráfego orgânico com a inteligência artificial mais avançada do mercado.",
      },
      { property: "og:title", content: "BlogAI Pro" },
      { property: "og:description", content: "IA Premium para blogueiros profissionais." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/` },
      { property: "og:image", content: `${SITE_URL}/og-image.jpg` },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/` }],
  }),
  component: TemporaryLandingPage,
});

function TemporaryLandingPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-primary-foreground text-3xl font-bold italic">B</span>
            </div>
          </div>
          <h1 className="text-4xl font-display font-bold tracking-tight">BlogAI Pro</h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            IA Premium para blogueiros profissionais: gere, otimize e publique artigos com SEO automático.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link to="/auth">{t("auth.login", "Entrar")}</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
            <Link to="/auth" search={{ mode: "signup" }}>{t("auth.signup", "Criar Conta")}</Link>
          </Button>
        </div>

        <div className="pt-8 border-t border-border/50 text-xs text-muted-foreground">
          © {new Date().getFullYear()} Júnnior Monzart. Todos os direitos reservados.
        </div>
      </div>
    </div>
  );
}
