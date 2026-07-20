// BlogAI Pro — v1.1 Onda 2
// Server-only helper. Coleta candidatos a links internos do próprio usuário
// (artigos já publicados no Blogger + páginas manuais do Perfil Inteligente)
// e produz um bloco de prompt que a IA usa para sugerir 2 a 4 links internos
// naturais dentro do artigo. Fonte única = Perfil Inteligente + biblioteca do
// próprio usuário. Nunca inventa URLs.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { SmartProfileLink } from "./smart-profile.server";

type SB = SupabaseClient<Database>;

export interface InternalLinkCandidate {
  title: string;
  url: string;
  /** "library" (artigo publicado) | "manual" (Perfil Inteligente) */
  source: "library" | "manual" | "blogger";
}

/**
 * Coleta candidatos a links internos:
 *  1. Artigos do próprio usuário com blogger_post_url definido (mais recentes).
 *  2. Links manuais definidos no Perfil Inteligente (default_links).
 * Retorna até `limit` candidatos únicos por URL.
 */
export async function collectInternalLinkCandidates(
  supabase: SB,
  userId: string,
  opts: { manualLinks?: SmartProfileLink[]; limit?: number } = {},
): Promise<InternalLinkCandidate[]> {
  const limit = Math.max(1, Math.min(20, opts.limit ?? 8));
  const items: InternalLinkCandidate[] = [];

  // Artigos publicados no Blogger (temos URL pública garantida)
  try {
    const { data } = await supabase
      .from("articles")
      .select("title, blogger_post_url, updated_at")
      .eq("user_id", userId)
      .not("blogger_post_url", "is", null)
      .order("updated_at", { ascending: false })
      .limit(limit);
    for (const row of data ?? []) {
      const url = (row as { blogger_post_url?: string | null }).blogger_post_url;
      const title = (row as { title?: string | null }).title;
      if (url && title) items.push({ title, url, source: "blogger" });
    }
  } catch {
    // silencioso — links internos são best-effort
  }

  // Links manuais do Perfil Inteligente
  for (const link of opts.manualLinks ?? []) {
    if (link?.label && link?.url) {
      items.push({ title: link.label, url: link.url, source: "manual" });
    }
  }

  // Dedupe por URL preservando ordem (blogger primeiro > manual)
  const seen = new Set<string>();
  const unique: InternalLinkCandidate[] = [];
  for (const it of items) {
    if (seen.has(it.url)) continue;
    seen.add(it.url);
    unique.push(it);
    if (unique.length >= limit) break;
  }
  return unique;
}

/**
 * Constrói o bloco de instrução para a IA. Retorna string vazia quando não há
 * candidatos — nesse caso o prompt permanece idêntico ao comportamento v1.0.
 */
export function buildInternalLinksPromptBlock(candidates: InternalLinkCandidate[]): string {
  if (!candidates.length) return "";
  const lines = candidates.map((c, i) => `  ${i + 1}. "${c.title}" — ${c.url}`).join("\n");
  return (
    `\n[Links internos disponíveis — use 2 a 4 deles como âncoras naturais dentro do artigo, ` +
    `apenas quando fizer sentido contextual. Formate em Markdown [texto](URL). ` +
    `Nunca invente URLs; use SOMENTE as listadas abaixo. Se nenhuma se aplicar, não force.]\n` +
    `${lines}\n`
  );
}
