import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Globe, Loader2, CheckCircle2, LinkIcon, Unlink, ExternalLink, Settings2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getBloggerStatus,
  getBloggerAuthUrl,
  listBloggerBlogs,
  selectBloggerBlog,
  disconnectBlogger,
} from "@/lib/blogger.functions";

export const Route = createFileRoute("/_authenticated/connections")({
  component: ConnectionsPage,
  errorComponent: ({ error }) => (
    <div role="alert" className="mx-auto max-w-2xl py-20 text-center text-muted-foreground">
      Não foi possível carregar as conexões: {error.message}
    </div>
  ),
});

function ConnectionsPage() {
  const queryClient = useQueryClient();
  const statusFn = useServerFn(getBloggerStatus);
  const authUrlFn = useServerFn(getBloggerAuthUrl);
  const blogsFn = useServerFn(listBloggerBlogs);
  const selectFn = useServerFn(selectBloggerBlog);
  const disconnectFn = useServerFn(disconnectBlogger);

  const [connecting, setConnecting] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: status, isLoading } = useQuery({
    queryKey: ["blogger-status"],
    queryFn: () => statusFn(),
  });

  const connected = !!status?.connected;

  const { data: blogsData, isLoading: blogsLoading } = useQuery({
    queryKey: ["blogger-blogs"],
    queryFn: () => blogsFn(),
    enabled: connected,
  });

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const state = crypto.randomUUID();
      sessionStorage.setItem("blogger_oauth_state", state);
      const redirectUri = `${window.location.origin}/blogger/callback`;
      const { url } = await authUrlFn({ data: { redirectUri, state } });
      window.location.href = url;
    } catch (e) {
      setConnecting(false);
      toast.error(e instanceof Error ? e.message : "Falha ao iniciar a conexão.");
    }
  };

  const handleSelectBlog = async (blogId: string) => {
    const blog = blogsData?.blogs.find((b) => b.id === blogId);
    if (!blog) return;
    setSaving(true);
    try {
      await selectFn({ data: { blogId: blog.id, blogName: blog.name } });
      await queryClient.invalidateQueries({ queryKey: ["blogger-status"] });
      toast.success(`Blog "${blog.name}" selecionado como destino.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao selecionar o blog.");
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectFn();
      await queryClient.invalidateQueries({ queryKey: ["blogger-status"] });
      await queryClient.invalidateQueries({ queryKey: ["blogger-blogs"] });
      toast.success("Conta do Blogger desconectada.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao desconectar.");
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold md:text-3xl">
          <Globe className="h-6 w-6 text-primary" /> Conexão com o Blogger
        </h1>
        <p className="text-muted-foreground">
          Conecte sua conta Google para publicar artigos diretamente no seu blog.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !connected ? (
        <Card className="flex flex-col items-center gap-4 p-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Globe className="h-7 w-7 text-primary" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Nenhuma conta conectada</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Autorize o acesso à sua conta Google do Blogger para listar seus blogs e publicar
              artigos com um clique.
            </p>
          </div>
          <Button variant="hero" onClick={handleConnect} disabled={connecting}>
            {connecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LinkIcon className="h-4 w-4" />
            )}
            Conectar conta Google
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-primary" />
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold">Conta conectada</p>
                  <Badge variant="secondary">Google</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{status?.email}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleDisconnect}>
              <Unlink className="h-4 w-4" /> Desconectar
            </Button>
          </Card>

          <Card className="space-y-4 p-6">
            <div className="space-y-1">
              <h2 className="font-semibold">Blog de destino</h2>
              <p className="text-sm text-muted-foreground">
                Escolha em qual blog os seus artigos serão publicados.
              </p>
            </div>

            {blogsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando blogs...
              </div>
            ) : (blogsData?.blogs.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum blog encontrado nesta conta. Crie um blog no Blogger e tente novamente.
              </p>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Select
                  value={status?.selectedBlogId ?? undefined}
                  onValueChange={handleSelectBlog}
                  disabled={saving}
                >
                  <SelectTrigger className="sm:max-w-sm">
                    <SelectValue placeholder="Selecione um blog" />
                  </SelectTrigger>
                  <SelectContent>
                    {blogsData?.blogs.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {status?.selectedBlogId && (
                  <a
                    href={blogsData?.blogs.find((b) => b.id === status.selectedBlogId)?.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    Ver blog <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
