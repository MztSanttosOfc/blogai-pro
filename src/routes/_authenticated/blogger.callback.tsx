import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { connectBlogger } from "@/lib/blogger.functions";

export const Route = createFileRoute("/_authenticated/blogger/callback")({
  component: BloggerCallbackPage,
});

function BloggerCallbackPage() {
  const navigate = useNavigate();
  const connectFn = useServerFn(connectBlogger);
  const ranRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const oauthError = params.get("error");
    const savedState = sessionStorage.getItem("blogger_oauth_state");
    sessionStorage.removeItem("blogger_oauth_state");

    if (oauthError) {
      setError("Autorização cancelada ou negada pelo Google.");
      return;
    }
    if (!code) {
      setError("Código de autorização ausente.");
      return;
    }
    if (!state || state !== savedState) {
      setError("Falha na verificação de segurança. Tente conectar novamente.");
      return;
    }

    const redirectUri = `${window.location.origin}/blogger/callback`;
    connectFn({ data: { code, redirectUri } })
      .then((res) => {
        toast.success(`Conta conectada${res.email ? `: ${res.email}` : ""}!`);
        navigate({ to: "/connections", replace: true });
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Falha ao conectar a conta.");
      });
  }, [connectFn, navigate]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center py-24 text-center">
      {error ? (
        <Card className="flex flex-col items-center gap-4 p-8">
          <AlertTriangle className="h-10 w-10 text-destructive" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="hero" onClick={() => navigate({ to: "/connections", replace: true })}>
            Voltar às conexões
          </Button>
        </Card>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Conectando sua conta do Blogger...</p>
        </div>
      )}
    </div>
  );
}
