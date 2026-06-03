import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Library, Copy, Trash2, Eye, Search, FileText, Send, Loader2 } from "lucide-react";
import { publishArticleToBlogger, getBloggerStatus } from "@/lib/blogger.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/library")({
  component: LibraryPage,
});

function LibraryPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const publishFn = useServerFn(publishArticleToBlogger);
  const bloggerStatusFn = useServerFn(getBloggerStatus);

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["articles", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("articles")
        .select("*")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const filtered = articles.filter(
    (a) =>
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.keyword.toLowerCase().includes(search.toLowerCase()),
  );

  const handleDuplicate = async (article: (typeof articles)[number]) => {
    const { id, created_at, updated_at, ...rest } = article;
    const { error } = await supabase
      .from("articles")
      .insert({ ...rest, title: `${rest.title} (cópia)`, status: "draft" });
    if (error) {
      toast.error("Erro ao duplicar artigo.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["articles"] });
    toast.success("Artigo duplicado!");
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("articles").delete().eq("id", deleteId);
    setDeleteId(null);
    if (error) {
      toast.error("Erro ao excluir artigo.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["articles"] });
    toast.success("Artigo excluído.");
  };

  const handlePublish = async (articleId: string) => {
    setPublishingId(articleId);
    try {
      const status = await bloggerStatusFn();
      if (!status.connected || !status.selectedBlogId) {
        toast.error(
          status.connected
            ? "Selecione um blog de destino na página de conexões."
            : "Conecte sua conta do Blogger primeiro.",
        );
        navigate({ to: "/connections" });
        return;
      }
      const res = await publishFn({ data: { articleId } });
      await queryClient.invalidateQueries({ queryKey: ["articles"] });
      toast.success("Artigo publicado no Blogger!", {
        action: res.url
          ? { label: "Abrir", onClick: () => window.open(res.url, "_blank") }
          : undefined,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao publicar no Blogger.");
    } finally {
      setPublishingId(null);
    }
  };


  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold md:text-3xl">
            <Library className="h-6 w-6 text-primary" /> Biblioteca
          </h1>
          <p className="text-muted-foreground">Gerencie todos os seus artigos gerados.</p>
        </div>
        <Button asChild variant="hero">
          <Link to="/generate">Novo artigo</Link>
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por título ou palavra-chave..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <FileText className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Nenhum artigo encontrado.</p>
          <Button asChild variant="hero">
            <Link to="/generate">Gerar artigo</Link>
          </Button>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((a) => (
            <Card key={a.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-semibold">{a.title || a.keyword}</h3>
                  <Badge variant={a.status === "published" ? "default" : "secondary"}>
                    {a.status === "published" ? "Publicado" : "Rascunho"}
                  </Badge>
                </div>
                <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                  {a.meta_description || a.keyword}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {a.word_count} palavras · {new Date(a.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button asChild variant="outline" size="sm">
                  <Link to="/library/$id" params={{ id: a.id }}>
                    <Eye className="h-4 w-4" /> Ver
                  </Link>
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDuplicate(a)} aria-label="Duplicar">
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleteId(a.id)}
                  aria-label="Excluir"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir artigo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O artigo será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
