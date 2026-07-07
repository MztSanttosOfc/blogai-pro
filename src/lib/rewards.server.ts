/**
 * Server-only helpers for the Rewards Center ("Central de Recompensas").
 *
 * Responsibilities (never shipped to the client bundle — `.server.ts`):
 *  - Discover new articles from the official blog via Atom/RSS feeds and
 *    sitemap.xml (Blogger / WordPress compatible).
 *  - Fetch and extract clean reading text from an article page.
 *  - Estimate reading time, difficulty and category.
 *  - Generate an adaptive multiple-choice quiz with the Lovable AI gateway.
 *
 * Import only from inside server-function handlers.
 */

import { assertPublicHttpUrl } from "./ssrf-guard";
import { makeSummary } from "./sanitize-text";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/** Eligible reward categories and the keywords used to auto-classify content. */
export const REWARD_CATEGORIES: { name: string; keywords: string[] }[] = [
  { name: "SEO", keywords: ["seo", "ranquea", "palavra-chave", "serp", "backlink", "indexa"] },
  { name: "Blogger", keywords: ["blogger", "blogspot", "blog do google"] },
  { name: "Google AdSense", keywords: ["adsense", "anúncio", "anuncio", "cpc", "rpm", "ecpm"] },
  { name: "Monetização", keywords: ["monetiza", "ganhar dinheiro", "renda", "receita", "afiliado"] },
  { name: "Inteligência Artificial", keywords: ["inteligência artificial", "ia ", "chatgpt", "gemini", "machine learning", "prompt"] },
  { name: "Desenvolvimento Web", keywords: ["html", "css", "javascript", "react", "desenvolvimento web", "código", "api"] },
  { name: "Marketing Digital", keywords: ["marketing", "tráfego", "trafego", "conversão", "funil", "leads", "redes sociais"] },
  { name: "Atualizações do BlogAI Pro", keywords: ["blogai", "atualização", "novidade", "lançamento"] },
  { name: "Tutoriais", keywords: ["tutorial", "passo a passo", "como fazer"] },
  { name: "Guias", keywords: ["guia", "guide", "completo"] },
  { name: "Conteúdos educacionais", keywords: ["aprenda", "curso", "educa", "dicas"] },
];

export interface DiscoveredArticle {
  url: string;
  title: string;
  publishedAt: string | null;
  excerpt: string;
}

export interface ArticleContent {
  title: string;
  content: string;
  excerpt: string;
  wordCount: number;
  category: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  /** Index (0-3) of the correct option. Stripped before sending to client. */
  correct: number;
}

const COMMON_HEADERS = {
  "User-Agent": USER_AGENT,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
} as const;

/** Fetch text following redirects manually so each hop is re-validated. */
async function fetchText(rawUrl: string, maxRedirects = 5): Promise<string | null> {
  let current: URL;
  try {
    current = assertPublicHttpUrl(rawUrl);
  } catch {
    return null;
  }
  for (let hop = 0; hop <= maxRedirects; hop++) {
    let res: Response;
    try {
      res = await fetch(current.toString(), {
        headers: COMMON_HEADERS,
        redirect: "manual",
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      return null;
    }
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const loc = res.headers.get("location");
      if (!loc) return null;
      try {
        const next = new URL(loc, current);
        assertPublicHttpUrl(next.toString());
        current = next;
        continue;
      } catch {
        return null;
      }
    }
    if (!res.ok) return null;
    try {
      return await res.text();
    } catch {
      return null;
    }
  }
  return null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, "&");
}

function stripCdata(s: string): string {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
}

function matchAll(re: RegExp, text: string): RegExpMatchArray[] {
  return Array.from(text.matchAll(re));
}

function tagInner(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return m ? stripCdata(m[1]).trim() : "";
}

/** Parse an Atom or RSS feed into discovered articles. */
function parseFeed(xml: string): DiscoveredArticle[] {
  const out: DiscoveredArticle[] = [];

  // Atom <entry>
  for (const m of matchAll(/<entry[\s>][\s\S]*?<\/entry>/gi, xml)) {
    const block = m[0];
    const title = decodeEntities(tagInner(block, "title").replace(/<[^>]+>/g, "")).trim();
    // Prefer rel="alternate" link, fallback to first href
    let url = "";
    const alt = block.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i);
    const anyHref = block.match(/<link[^>]*href=["']([^"']+)["']/i);
    url = (alt?.[1] || anyHref?.[1] || tagInner(block, "id") || "").trim();
    const published =
      tagInner(block, "published") || tagInner(block, "updated") || null;
    const summaryRaw = tagInner(block, "summary") || tagInner(block, "content");
    const excerpt = makeSummary(summaryRaw);
    if (url && title) out.push({ url, title, publishedAt: published, excerpt });
  }

  if (out.length) return out;

  // RSS <item>
  for (const m of matchAll(/<item[\s>][\s\S]*?<\/item>/gi, xml)) {
    const block = m[0];
    const title = decodeEntities(tagInner(block, "title").replace(/<[^>]+>/g, "")).trim();
    const url = decodeEntities(tagInner(block, "link")).trim();
    const published = tagInner(block, "pubDate") || null;
    const excerpt = decodeEntities(tagInner(block, "description").replace(/<[^>]+>/g, " "))
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 280);
    if (url && title) out.push({ url, title, publishedAt: published, excerpt });
  }

  return out;
}

/** Parse <loc> entries from a sitemap (or sitemap index). */
function parseSitemapLocs(xml: string): string[] {
  return matchAll(/<loc>\s*([\s\S]*?)\s*<\/loc>/gi, xml)
    .map((m) => decodeEntities(stripCdata(m[1])).trim())
    .filter(Boolean);
}

/**
 * Discover recent articles for a blog. Tries Atom/RSS feeds first (richest
 * metadata) and falls back to sitemap.xml. Returns up to `limit` items.
 */
export async function discoverArticles(blogUrl: string, limit = 30): Promise<DiscoveredArticle[]> {
  let origin: string;
  try {
    origin = assertPublicHttpUrl(blogUrl).origin;
  } catch {
    return [];
  }

  const feedCandidates = [
    `${origin}/feeds/posts/default?alt=rss&max-results=${limit}`, // Blogger RSS
    `${origin}/feeds/posts/default?max-results=${limit}`, // Blogger Atom
    `${origin}/atom.xml`,
    `${origin}/rss.xml`,
    `${origin}/feed`,
    `${origin}/?feed=rss2`, // WordPress
  ];

  for (const feed of feedCandidates) {
    const xml = await fetchText(feed);
    if (!xml) continue;
    const items = parseFeed(xml);
    if (items.length) {
      return dedupe(items).slice(0, limit);
    }
  }

  // Sitemap fallback (URLs only — titles fetched later when imported).
  const sitemapCandidates = [`${origin}/sitemap.xml`, `${origin}/sitemap-pages.xml`];
  for (const sm of sitemapCandidates) {
    const xml = await fetchText(sm);
    if (!xml) continue;
    let locs = parseSitemapLocs(xml);
    // Sitemap index: fetch the first child sitemap.
    if (/<sitemapindex/i.test(xml) && locs.length) {
      const child = await fetchText(locs[0]);
      if (child) locs = parseSitemapLocs(child);
    }
    const articleLocs = locs.filter((u) => u.startsWith(origin) && u !== `${origin}/`);
    if (articleLocs.length) {
      return dedupe(
        articleLocs.map((u) => ({ url: u, title: "", publishedAt: null, excerpt: "" })),
      ).slice(0, limit);
    }
  }

  return [];
}

function dedupe(items: DiscoveredArticle[]): DiscoveredArticle[] {
  const seen = new Set<string>();
  const out: DiscoveredArticle[] = [];
  for (const it of items) {
    const key = normalizeUrl(it.url);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}

/** Normalize a URL into a stable external_id (drop hash/trailing slash). */
export function normalizeUrl(u: string): string {
  try {
    const url = new URL(u);
    url.hash = "";
    let s = url.toString();
    if (s.endsWith("/")) s = s.slice(0, -1);
    return s.toLowerCase();
  } catch {
    return u.trim().toLowerCase();
  }
}

/** Extract the main readable text from an article HTML page. */
export async function fetchArticleContent(url: string): Promise<ArticleContent | null> {
  const html = await fetchText(url);
  if (!html) return null;

  // Title preference: og:title > <title> > first <h1>
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const title = decodeEntities(
    (ogTitle?.[1] || (titleTag ? titleTag[1] : "") || (h1 ? h1[1].replace(/<[^>]+>/g, "") : "") || "Artigo")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " "),
  ).trim();

  // Isolate the most likely content container.
  let body = html;
  const article = html.match(/<article[\s>][\s\S]*?<\/article>/i);
  const postBody = html.match(/<div[^>]+class=["'][^"']*post-body[^"']*["'][\s\S]*?<\/div>/i);
  const main = html.match(/<main[\s>][\s\S]*?<\/main>/i);
  if (article) body = article[0];
  else if (postBody) body = postBody[0];
  else if (main) body = main[0];

  const text = decodeEntities(
    body
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
      .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();

  if (text.length < 200) return null; // not a real article

  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const excerpt = text.slice(0, 280);
  const category = guessCategory(`${title} ${text.slice(0, 2000)}`);

  return { title, content: text.slice(0, 12000), excerpt, wordCount, category };
}

export function guessCategory(text: string): string {
  const low = text.toLowerCase();
  let best = "Conteúdos educacionais";
  let bestScore = 0;
  for (const cat of REWARD_CATEGORIES) {
    let score = 0;
    for (const kw of cat.keywords) if (low.includes(kw)) score++;
    if (score > bestScore) {
      bestScore = score;
      best = cat.name;
    }
  }
  return best;
}

export function estimateReadSeconds(wordCount: number, secondsPer100Words: number): number {
  const seconds = Math.round((wordCount / 100) * secondsPer100Words);
  return Math.max(30, Math.min(seconds, 60 * 60));
}

export function computeDifficulty(wordCount: number): "facil" | "medio" | "dificil" {
  if (wordCount < 500) return "facil";
  if (wordCount < 1200) return "medio";
  return "dificil";
}

interface RewardCreditSettings {
  credits_per_article: number;
  credits_by_difficulty: Record<string, number>;
  credits_by_category: Record<string, number>;
}

export function creditsForMission(
  settings: RewardCreditSettings,
  difficulty: string,
  category: string,
): number {
  const byCategory = settings.credits_by_category?.[category];
  if (typeof byCategory === "number" && byCategory > 0) return byCategory;
  const byDifficulty = settings.credits_by_difficulty?.[difficulty];
  if (typeof byDifficulty === "number" && byDifficulty > 0) return byDifficulty;
  return Math.max(1, settings.credits_per_article || 1);
}

/** Generate an adaptive multiple-choice quiz from article content via Lovable AI. */
export async function generateQuiz(
  apiKey: string,
  title: string,
  content: string,
  wordCount: number,
): Promise<QuizQuestion[]> {
  const numQuestions = wordCount > 1200 ? 5 : wordCount > 600 ? 4 : 3;

  const systemPrompt =
    "Você é um gerador de quizzes educacionais. Leia o artigo e crie perguntas de múltipla " +
    "escolha que verifiquem a real compreensão do conteúdo. Responda APENAS com um objeto JSON " +
    "válido, sem texto extra e sem blocos de código. Escreva tudo em português do Brasil.";

  const userPrompt =
    `Artigo: "${title}"\n\n` +
    `Conteúdo:\n${content.slice(0, 8000)}\n\n` +
    `Gere EXATAMENTE ${numQuestions} perguntas baseadas no conteúdo do artigo. ` +
    `Cada pergunta deve ter 4 alternativas plausíveis e apenas 1 correta. ` +
    `Ajuste a dificuldade conforme a profundidade do artigo. ` +
    `Retorne neste formato JSON:\n` +
    `{ "questions": [ { "question": "texto", "options": ["a","b","c","d"], "correct": 0 } ] }\n` +
    `O campo "correct" é o índice (0 a 3) da alternativa correta.`;

  let response: Response;
  try {
    response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 2000,
        temperature: 0.5,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(45000),
    });
  } catch {
    throw new Error("Falha de conexão ao gerar o quiz. Tente novamente.");
  }

  if (response.status === 429)
    throw new Error("Limite de requisições atingido. Tente novamente em instantes.");
  if (response.status === 402)
    throw new Error("Créditos de IA do workspace esgotados.");
  if (!response.ok) throw new Error("Não foi possível gerar o quiz. Tente novamente.");

  const completion = await response.json();
  const raw: string = completion?.choices?.[0]?.message?.content ?? "";
  let parsed: unknown;
  try {
    let txt = raw.trim();
    const fenced = txt.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) txt = fenced[1].trim();
    const start = txt.indexOf("{");
    const end = txt.lastIndexOf("}");
    parsed = JSON.parse(txt.slice(start, end + 1));
  } catch {
    throw new Error("Resposta do quiz inválida. Tente novamente.");
  }

  const list = (parsed as { questions?: unknown }).questions;
  if (!Array.isArray(list) || list.length === 0)
    throw new Error("O quiz não pôde ser gerado para este artigo.");

  const questions: QuizQuestion[] = [];
  for (const q of list) {
    const obj = q as { question?: unknown; options?: unknown; correct?: unknown };
    const question = typeof obj.question === "string" ? obj.question.trim() : "";
    const options = Array.isArray(obj.options)
      ? obj.options.map((o) => String(o).trim()).filter(Boolean).slice(0, 4)
      : [];
    let correct = Number(obj.correct);
    if (!Number.isInteger(correct) || correct < 0 || correct >= options.length) correct = 0;
    if (question && options.length === 4) questions.push({ question, options, correct });
  }

  if (questions.length === 0)
    throw new Error("O quiz não pôde ser gerado para este artigo.");
  return questions;
}
