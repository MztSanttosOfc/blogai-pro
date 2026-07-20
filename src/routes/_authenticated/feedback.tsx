import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MessageSquare, Send, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  submitFeedback,
  listMyFeedbacks,
  deleteFeedback,
} from "@/lib/feedback.functions";

export const Route = createFileRoute("/_authenticated/feedback")({
  head: () => ({
    meta: [
      { title: "Central de Feedback — BlogAI Pro" },
      { name: "description", content: "Envie sua opinião, sugestões e relatos ao time do BlogAI Pro." },
    ],
  }),
  component: FeedbackPage,
});

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} estrelas`}
          onClick={() => onChange(n)}
          className="p-1 transition hover:scale-110"
        >
          <Star
            className={`h-6 w-6 ${n <= value ? "fill-primary text-primary" : "text-muted-foreground"}`}
          />
        </button>
      ))}
    </div>
  );
}

function FeedbackPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const listFn = useServerFn(listMyFeedbacks);
  const submitFn = useServerFn(submitFeedback);
  const deleteFn = useServerFn(deleteFeedback);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["feedback", "mine"],
    queryFn: () => listFn(),
  });

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [issue, setIssue] = useState("");

  const submitMut = useMutation({
    mutationFn: () =>
      submitFn({
        data: {
          rating,
          comment: comment.trim() || null,
          suggestion: suggestion.trim() || null,
          issue: issue.trim() || null,
        },
      }),
    onSuccess: () => {
      toast.success(t("feedback.submitted", { defaultValue: "Obrigado! Feedback enviado." }));
      setComment("");
      setSuggestion("");
      setIssue("");
      setRating(5);
      queryClient.invalidateQueries({ queryKey: ["feedback", "mine"] });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar feedback");
    },
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback", "mine"] });
    },
  });

  const hasAnyText = comment.trim() || suggestion.trim() || issue.trim();

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold sm:text-3xl">
            {t("feedback.title", { defaultValue: "Central de Feedback" })}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("feedback.subtitle", {
            defaultValue:
              "Sua opinião guia o rumo do BlogAI Pro. Compartilhe elogios, sugestões e problemas — leemos todos.",
          })}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{t("feedback.newTitle", { defaultValue: "Novo feedback" })}</CardTitle>
          <CardDescription>
            {t("feedback.newHint", { defaultValue: "Avalie sua experiência e nos conte detalhes." })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">
              {t("feedback.rating", { defaultValue: "Avaliação geral" })}
            </label>
            <StarPicker value={rating} onChange={setRating} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              {t("feedback.commentLabel", { defaultValue: "Comentário (opcional)" })}
            </label>
            <Textarea
              rows={3}
              maxLength={2000}
              placeholder={t("feedback.commentPh", { defaultValue: "O que você achou?" })}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              {t("feedback.suggestionLabel", { defaultValue: "Sugestão de melhoria" })}
            </label>
            <Textarea
              rows={2}
              maxLength={2000}
              placeholder={t("feedback.suggestionPh", { defaultValue: "O que poderíamos adicionar?" })}
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              {t("feedback.issueLabel", { defaultValue: "Problema encontrado" })}
            </label>
            <Textarea
              rows={2}
              maxLength={2000}
              placeholder={t("feedback.issuePh", { defaultValue: "Encontrou algum bug?" })}
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => submitMut.mutate()}
              disabled={submitMut.isPending || (!hasAnyText && rating === 5) ? false : submitMut.isPending}
              variant="hero"
            >
              <Send className="mr-2 h-4 w-4" />
              {submitMut.isPending
                ? t("common.saving")
                : t("feedback.submit", { defaultValue: "Enviar feedback" })}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("feedback.mineTitle", { defaultValue: "Meus feedbacks" })}</CardTitle>
          <CardDescription>
            {t("feedback.mineHint", { defaultValue: "Histórico do que você enviou e as respostas da equipe." })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("feedback.empty", { defaultValue: "Você ainda não enviou nenhum feedback." })}
            </p>
          ) : (
            <ul className="space-y-3">
              {items.map((f) => (
                <li key={f.id} className="rounded-lg border border-border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            className={`h-4 w-4 ${n <= f.rating ? "fill-primary text-primary" : "text-muted-foreground"}`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(f.created_at).toLocaleString()}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMut.mutate(f.id)}
                      aria-label={t("common.delete")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {f.comment && <p className="text-sm">{f.comment}</p>}
                  {f.suggestion && (
                    <p className="mt-1 text-sm">
                      <Badge variant="secondary" className="mr-2">
                        {t("feedback.suggestionLabel", { defaultValue: "Sugestão" })}
                      </Badge>
                      {f.suggestion}
                    </p>
                  )}
                  {f.issue && (
                    <p className="mt-1 text-sm">
                      <Badge variant="destructive" className="mr-2">
                        {t("feedback.issueLabel", { defaultValue: "Problema" })}
                      </Badge>
                      {f.issue}
                    </p>
                  )}
                  {f.admin_reply && (
                    <div className="mt-2 rounded-md border border-primary/20 bg-primary/5 p-2 text-sm">
                      <p className="mb-1 text-xs font-semibold text-primary">
                        {t("feedback.adminReply", { defaultValue: "Resposta da equipe" })}
                      </p>
                      <p>{f.admin_reply}</p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
