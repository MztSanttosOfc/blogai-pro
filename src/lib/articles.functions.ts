import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GenerateInput = z.object({
  keyword: z.string().trim().min(2).max(120),
  title: z.string().trim().max(160).optional().default(""),
  wordCount: z.number().int().min(300).max(3000).default(800),
  tone: z.string().trim().min(2).max(40).default("Profissional"),
  language: z.string().trim().min(2).max(40).default("Português"),
});

interface GeneratedArticle {
  title: string;
  meta_description: string;
  headings: { type: "h2" | "h3"; text: string }[];
  content: string;
  faq: { question: string; answer: string }[];
  tags: string[];
}

const ArticleResponseSchema = z.object({
  title: z.string().trim().min(1).max(180),
  meta_description: z.string().trim().max(260).default(""),
  headings: z
    .array(
      z.object({
        type: z.enum(["h2", "h3"]).default("h2"),
        text: z.string().trim().min(1),
      }),
    )
    .default([]),
  content: z.string().trim().min(50),
  faq: z
    .array(
      z.object({
        question: z.string().trim().min(1),
        answer: z.string().trim().min(1),
      }),
    )
    .default([]),
  tags: z.array(z.string().trim().min(1)).default([]),
});

function logAiParsing(stage: string, payload: unknown) {
  console.info(`[article-ai:${stage}]`, JSON.stringify(payload, null, 2));
}

function extractJsonObject(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const source = (fenced?.[1] ?? text).trim();
  const first = source.indexOf("{");
  if (first === -1) return source;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = first; i < source.length; i += 1) {
    const char = source[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) return source.slice(first, i + 1);
  }
  return source.slice(first);
}

function normalizeArticlePayload(input: unknown, keywordFallback = ""): unknown {
  const obj = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const wrapped =
    obj.article && typeof obj.article === "object"
      ? (obj.article as Record<string, unknown>)
      : obj.data && typeof obj.data === "object"
        ? (obj.data as Record<string, unknown>)
        : obj;

  const rawHeadings = Array.isArray(wrapped.headings)
    ? wrapped.headings
    : Array.isArray(wrapped.outline)
      ? wrapped.outline
      : [];
  const headings = rawHeadings
    .map((heading) => {
      if (typeof heading === "string") return { type: "h2", text: heading };
      if (heading && typeof heading === "object") {
        const h = heading as Record<string, unknown>;
        const type = h.type === "h3" || h.level === 3 || h.level === "h3" ? "h3" : "h2";
        return { type, text: String(h.text ?? h.title ?? h.heading ?? "").trim() };
      }
      return null;
    })
    .filter(Boolean);

  const rawContent = wrapped.content ?? wrapped.fullContent ?? wrapped.full_content ?? wrapped.articleContent;
  const content = Array.isArray(rawContent)
    ? rawContent.map((part) => (typeof part === "string" ? part : JSON.stringify(part))).join("\n\n")
    : String(rawContent ?? "");

  const rawFaq = Array.isArray(wrapped.faq) ? wrapped.faq : [];
  const faq = rawFaq
    .map((item) => {
      if (typeof item === "string") return { question: item, answer: "" };
      if (item && typeof item === "object") {
        const f = item as Record<string, unknown>;
        return {
          question: String(f.question ?? f.pergunta ?? f.q ?? "").trim(),
          answer: String(f.answer ?? f.resposta ?? f.a ?? "").trim(),
        };
      }
      return null;
    })
    .filter(Boolean);

  const rawTags = Array.isArray(wrapped.tags)
    ? wrapped.tags
    : typeof wrapped.tags === "string"
      ? wrapped.tags.split(",")
      : [];

  return {
    title: wrapped.title ?? wrapped.titleSEO ?? wrapped.seo_title ?? keywordFallback,
    meta_description: wrapped.meta_description ?? wrapped.metaDescription ?? wrapped.meta ?? "",
    headings,
    content,
    faq,
    tags: rawTags.map((tag) => String(tag).trim()).filter(Boolean),
  };
}

/**
 * Robustly extract and parse the JSON article object returned by the AI.
 * Handles markdown fences, surrounding prose, trailing commas, control chars,
 * and detects truncated responses (token-limit cuts) to give a clear error.
 */
function parseArticleJson(raw: string, finishReason?: string, keywordFallback = ""): GeneratedArticle {
  logAiParsing("raw", { finishReason, raw });

  let cleaned = extractJsonObject(raw);
  logAiParsing("cleaned", { cleaned });

  const tryParse = (s: string): unknown | null => {
    try {
      return JSON.parse(s) as unknown;
    } catch {
      return null;
    }
  };

  let parsed = tryParse(cleaned);

  if (!parsed) {
    // Repair common issues: trailing commas and stray control characters.
    const repaired = cleaned
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]")
      .replace(/[\u0000-\u001F\u007F]/g, " ");
    parsed = tryParse(repaired);
    if (parsed) cleaned = repaired;
  }

  if (!parsed) {
    // If the model hit the token limit, the JSON is incomplete.
    const openBraces = (cleaned.match(/{/g) || []).length;
    const closeBraces = (cleaned.match(/}/g) || []).length;
    if (finishReason === "length" || openBraces !== closeBraces) {
      throw new Error(
        "O artigo ficou muito longo e foi cortado. Tente gerar com menos palavras.",
      );
    }
    logAiParsing("parse-error", { cleaned });
    throw new Error("Resposta da IA inválida. Tente novamente.");
  }

  const normalized = normalizeArticlePayload(parsed, keywordFallback);
  const validated = ArticleResponseSchema.safeParse(normalized);
  if (!validated.success) {
    logAiParsing("validation-error", {
      parsed,
      normalized,
      issues: validated.error.issues,
    });
    throw new Error("Resposta da IA inválida. A estrutura do artigo veio incompleta.");
  }

  logAiParsing("validated", validated.data);
  return validated.data;
}

export const generateArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GenerateInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Check credits
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("credits, plan")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      throw new Error("Perfil não encontrado.");
    }

    const unlimited = profile.plan === "premium";
    if (!unlimited && profile.credits <= 0) {
      throw new Error("Você não tem créditos suficientes. Faça upgrade do seu plano.");
    }

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Serviço de IA indisponível no momento.");

    const systemPrompt =
      `Você é um redator especialista em SEO e marketing de conteúdo para blogs (Blogger). ` +
      `Escreva sempre no idioma solicitado e responda APENAS com JSON válido, sem texto extra.`;

    const userPrompt =
      `Crie um artigo de blog completo e otimizado para SEO.\n` +
      `- Palavra-chave principal: "${data.keyword}"\n` +
      (data.title ? `- Título sugerido: "${data.title}"\n` : "") +
      `- Tamanho aproximado: ${data.wordCount} palavras\n` +
      `- Tom de escrita: ${data.tone}\n` +
      `- Idioma: ${data.language}\n\n` +
      `Retorne um objeto JSON com EXATAMENTE estas chaves:\n` +
      `{\n` +
      `  "title": "título otimizado para SEO (máx 60 caracteres)",\n` +
      `  "meta_description": "meta descrição persuasiva (máx 155 caracteres)",\n` +
      `  "headings": [{"type":"h2"|"h3","text":"..."}],\n` +
      `  "content": "artigo completo em Markdown, usando ## e ### para títulos, parágrafos e listas",\n` +
      `  "faq": [{"question":"...","answer":"..."}],\n` +
      `  "tags": ["tag1","tag2", ...]\n` +
      `}\n` +
      `O campo headings deve refletir a estrutura H2/H3 usada no content. Gere de 4 a 6 perguntas no FAQ e de 5 a 8 tags.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: 16000,
        temperature: 0.7,
      }),
    });

    if (response.status === 429) {
      throw new Error("Limite de requisições atingido. Tente novamente em alguns instantes.");
    }
    if (response.status === 402) {
      throw new Error("Créditos de IA do workspace esgotados. Adicione créditos para continuar.");
    }
    if (!response.ok) {
      throw new Error("Falha ao gerar o artigo. Tente novamente.");
    }

    const completion = await response.json();
    const choice = completion?.choices?.[0];
    const finishReason = choice?.finish_reason ?? choice?.native_finish_reason;
    const raw: string = choice?.message?.content ?? "";

    console.info(
      "[article-ai:completion]",
      JSON.stringify({
        model: completion?.model,
        finishReason,
        usage: completion?.usage,
        contentType: typeof raw,
        contentLength: raw.length,
      }),
    );

    if (!raw.trim()) {
      throw new Error("A IA não retornou conteúdo. Tente novamente.");
    }

    const parsed = parseArticleJson(raw, finishReason, data.keyword);

    const headings = Array.isArray(parsed.headings) ? parsed.headings : [];
    const faq = Array.isArray(parsed.faq) ? parsed.faq : [];
    const tags = Array.isArray(parsed.tags) ? parsed.tags : [];

    // Persist article
    const { data: inserted, error: insertError } = await supabase
      .from("articles")
      .insert({
        user_id: userId,
        keyword: data.keyword,
        title: parsed.title || data.keyword,
        meta_description: parsed.meta_description || "",
        headings: headings,
        content: parsed.content || "",
        faq: faq,
        tags: tags,
        tone: data.tone,
        language: data.language,
        word_count: data.wordCount,
        status: "draft",
      })
      .select()
      .single();

    if (insertError || !inserted) {
      throw new Error("Não foi possível salvar o artigo gerado.");
    }

    // Decrement credit (skip for premium/unlimited)
    if (!unlimited) {
      await supabase
        .from("profiles")
        .update({ credits: Math.max(0, profile.credits - 1) })
        .eq("id", userId);
    }

    return { article: inserted };
  });
