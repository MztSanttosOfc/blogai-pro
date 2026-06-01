import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  Save,
  Send,
  Copy,
  Tag,
  HelpCircle,
  ListTree,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Markdown } from "@/components/Markdown";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/library/$id")({
  component: ArticleDetailPage,
});

interface Heading {
  type: string;
  text: string;
}
interface Faq {
  question: string;
  answer: string;
}

function ArticleDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: article, isLoading } = useQuery({
    queryKey: ["article", id],
    queryFn: async () => {
      const { data } = await supabase.from("articles").select("*").eq("id", id).maybeSingle();
      return data;
    },
  });

  const [title, setTitle] = useState("");
  const [meta, setMeta] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (article) {
      setTitle(article.title);
      setMeta(article.meta_description);
      setContent(article.content);
    }
  }, [article]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="mx-auto max-w-2xl py-20 text-center">
        <p className="text-muted-foreground">Artigo não encontrado.</p>
        <Button asChild variant="hero" className="mt-4">
          <Link to="/library">Voltar à biblioteca</Link>
        </Button>
      </div>
    );
  }

  const headings = (article.headings as unknown as Heading[]) ?? [];
  const faq = (article.faq as unknown as Faq[]) ?? [];
  const tags = article.tags ?? [];

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("articles")
      .update({ title, meta_description: meta, content })
      .eq("id", id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["article", id] });
    await queryClient.invalidateQueries({ queryKey: ["articles"] });
    setEditing(false);
    toast.success("Alterações salvas!");
  };

  const handlePublishToBlogger = () => {
    toast.info("Integração com Blogger em breve! Estamos finalizando esta funcionalidade.");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    toast.success("Conteúdo copiado!");
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/library" })}>
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="h-4 w-4" /> Copiar
          </Button>
          {editing ? (
            <Button variant="hero" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              Editar
            </Button>
          )}
          <Button variant="hero" size="sm" onClick={handlePublishToBlogger}>
            <Send className="h-4 w-4" /> Publicar no Blogger
          </Button>
        </div>
      </div>

      <Card className="space-y-4 p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={article.status === "published" ? "default" : "secondary"}>
            {article.status === "published" ? "Publicado" : "Rascunho"}
          </Badge>
          <Badge variant="outline">{article.tone}</Badge>
          <Badge variant="outline">{article.language}</Badge>
          <Badge variant="outline">{article.word_count} palavras</Badge>
        </div>

        {editing ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título SEO</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Meta descrição</Label>
              <Textarea value={meta} onChange={(e) => setMeta(e.target.value)} rows={3} />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <h1 className="text-2xl font-bold md:text-3xl">{article.title}</h1>
            <p className="text-sm text-muted-foreground">{article.meta_description}</p>
          </div>
        )}
      </Card>

      <Tabs defaultValue="article">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="article">Artigo</TabsTrigger>
          <TabsTrigger value="outline">Estrutura</TabsTrigger>
          <TabsTrigger value="faq">FAQ</TabsTrigger>
          <TabsTrigger value="tags">Tags</TabsTrigger>
        </TabsList>

        <TabsContent value="article">
          <Card className="p-6">
            {editing ? (
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={24}
                className="font-mono text-sm"
              />
            ) : (
              <article className="max-w-none">
                <Markdown content={content} />
              </article>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="outline">
          <Card className="space-y-2 p-6">
            <h3 className="flex items-center gap-2 font-semibold">
              <ListTree className="h-4 w-4 text-primary" /> Headings (H2/H3)
            </h3>
            {headings.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem estrutura registrada.</p>
            ) : (
              <ul className="space-y-1.5">
                {headings.map((h, i) => (
                  <li
                    key={i}
                    className={h.type === "h3" ? "ml-5 text-sm text-muted-foreground" : "font-medium"}
                  >
                    <span className="mr-2 text-xs uppercase text-primary">{h.type}</span>
                    {h.text}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="faq">
          <Card className="space-y-4 p-6">
            <h3 className="flex items-center gap-2 font-semibold">
              <HelpCircle className="h-4 w-4 text-primary" /> Perguntas frequentes
            </h3>
            {faq.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem FAQ registrado.</p>
            ) : (
              faq.map((f, i) => (
                <div key={i} className="space-y-1">
                  <p className="font-medium">{f.question}</p>
                  <p className="text-sm text-muted-foreground">{f.answer}</p>
                </div>
              ))
            )}
          </Card>
        </TabsContent>

        <TabsContent value="tags">
          <Card className="space-y-3 p-6">
            <h3 className="flex items-center gap-2 font-semibold">
              <Tag className="h-4 w-4 text-primary" /> Tags sugeridas
            </h3>
            <div className="flex flex-wrap gap-2">
              {tags.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem tags.</p>
              ) : (
                tags.map((t, i) => (
                  <Badge key={i} variant="secondary">
                    {t}
                  </Badge>
                ))
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
