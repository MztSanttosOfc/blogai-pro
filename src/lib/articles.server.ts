// Fonte única para operações CRUD de artigos.
// Usada tanto por createServerFn quanto pela API REST /api/v1/articles.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type SB = SupabaseClient<Database>;

export interface ArticleListItem {
  id: string;
  title: string;
  keyword: string;
  status: string;
  language: string | null;
  word_count: number | null;
  created_at: string;
  updated_at: string;
}

export async function listArticlesFor(
  supabase: SB,
  opts: { limit?: number; offset?: number; search?: string } = {},
): Promise<{ items: ArticleListItem[]; total: number }> {
  const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
  const offset = Math.max(0, opts.offset ?? 0);
  let q = supabase
    .from("articles")
    .select("id, title, keyword, status, language, word_count, created_at, updated_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false });

  if (opts.search) {
    q = q.or(`title.ilike.%${opts.search}%,keyword.ilike.%${opts.search}%`);
  }

  const { data, error, count } = await q.range(offset, offset + limit - 1);
  if (error) throw new Error("Não foi possível carregar os artigos.");
  return { items: (data ?? []) as ArticleListItem[], total: count ?? 0 };
}

export async function getArticleFor(supabase: SB, id: string) {
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Não foi possível carregar o artigo.");
  return data;
}

export async function deleteArticleFor(supabase: SB, id: string): Promise<void> {
  const { error } = await supabase.from("articles").delete().eq("id", id);
  if (error) throw new Error("Não foi possível excluir o artigo.");
}
