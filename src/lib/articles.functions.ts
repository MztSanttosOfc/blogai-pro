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

function logAi(stage: string, payload: unknown) {
  console.info(`[article-ai:${stage}]`, JSON.stringify(payload, null, 2));
}

/**
 * Derive the H2/H3 outline from the generated Markdown content.
 * This avoids relying on the model to keep a separate headings list in sync
 * and is impossible to get out of order with the actual article.
 */
function extractHeadings(markdown: string): { type: "h2" | "h3"; text: string }[] {
  const headings: { type: "h2" | "h3"; text: string }[] = [];
  for (const rawLine of markdown.split("\n")) {
    const line = rawLine.trim();
    const h3 = line.match(/^###\s+(.*)$/);
    if (h3) {
      headings.push({ type: "h3", text: h3[1].trim() });
      continue;
    }
    const h2 = line.match(/^##\s+(.*)$/);
    if (h2) {
      headings.push({ type: "h2", text: h2[1].trim() });
    }
  }
  return headings;
}

/**
 * Parse the FAQ block. Each item is a `P:` (pergunta) line followed by an
 * `R:` (resposta) line. Answers may span multiple lines until the next `P:`.
 */
function parseFaq(block: string): { question: string; answer: string }[] {
  const faq: { question: string; answer: string }[] = [];
  let current: { question: string; answer: string[] } | null = null;

  const flush = () => {
    if (current && current.question.trim()) {
      faq.push({
        question: current.question.trim(),
        answer: current.answer.join("\n").trim(),
      });
    }
  };

  for (const rawLine of block.split("\n")) {
    const line = rawLine.trim();
    const q = line.match(/^(?:P|Q|Pergunta|Question)\s*[:\-]\s*(.*)$/i);
    const a = line.match(/^(?:R|A|Resposta|Answer)\s*[:\-]\s*(.*)$/i);
    if (q) {
      flush();
      current = { question: q[1].trim(), answer: [] };
    } else if (a && current) {
      current.answer.push(a[1].trim());
    } else if (current && line) {
      // continuation of the previous answer
      current.answer.push(line);
    }
  }
  flush();
  return faq;
}

/**
 * Definitive, escaping-free parser for the delimiter-based AI response.
 *
 * The model is asked to return plain text with section markers instead of a
 * JSON object. Embedding a multi-paragraph Markdown article inside a JSON
 * string was the root cause of recurring "Resposta da IA inválida" errors:
 * the model frequently produced unescaped quotes/newlines, yielding invalid
 * JSON even when the response was NOT truncated. A delimiter format removes
 * that whole class of failures because the large content field never needs
 * escaping.
 */
function parseDelimitedArticle(
  raw: string,
  finishReason: string | undefined,
  keywordFallback: string,
): GeneratedArticle {
  logAi("raw", { finishReason, length: raw.length });

  // Strip any accidental code fences the model may wrap around the response.
  let text = raw.trim();
  const fenced = text.match(/^```[a-zA-Z]*\s*([\s\S]*?)```$/);
  if (fenced) text = fenced[1].trim();

  const grab = (label: string): string => {
    const re = new RegExp(`^\\s*${label}\\s*:\\s*(.*)$`, "im");
    const m = text.match(re);
    return m ? m[1].trim() : "";
  };

  // Split off the CONTENT section (everything after the marker).
  const contentMarker = /(?:^|\n)\s*={2,}\s*CONTENT\s*={2,}\s*\n/i;
  const faqMarker = /(?:^|\n)\s*={2,}\s*FAQ\s*={2,}\s*\n/i;

  let header = text;
  let content = "";
  const contentSplit = text.split(contentMarker);
  if (contentSplit.length >= 2) {
    header = contentSplit[0];
    content = contentSplit.slice(1).join("\n").trim();
  }

  let faqBlock = "";
  const faqSplit = header.split(faqMarker);
  if (faqSplit.length >= 2) {
    header = faqSplit[0];
    faqBlock = faqSplit.slice(1).join("\n").trim();
  }

  const headerText = header;
  const grabFrom = (label: string): string => {
    const re = new RegExp(`^\\s*${label}\\s*:\\s*(.*)$`, "im");
    const m = headerText.match(re);
    return m ? m[1].trim() : "";
  };

  const title = (grabFrom("TITLE") || grab("TITLE") || keywordFallback).slice(0, 180);
  const metaDescription = (grabFrom("META") || grab("META")).slice(0, 260);
  const tagsRaw = grabFrom("TAGS") || grab("TAGS");
  const tags = tagsRaw
    .split(/[,;]/)
    .map((t) => t.trim().replace(/^#/, ""))
    .filter(Boolean)
    .slice(0, 12);

  const faq = parseFaq(faqBlock);
  const headings = extractHeadings(content);

  // Detect truncation / empty content as a clear, actionable error.
  if (!content || content.length < 50) {
    if (finishReason === "length") {
      throw new Error("O artigo ficou muito longo e foi cortado. Tente gerar com menos palavras.");
    }
    logAi("empty-content", { headerPreview: header.slice(0, 300) });
    throw new Error("A IA não retornou o conteúdo do artigo. Tente novamente.");
  }

  const result: GeneratedArticle = {
    title: title || keywordFallback,
    meta_description: metaDescription,
    headings,
    content,
    faq,
    tags,
  };
  logAi("parsed", {
    title: result.title,
    headings: result.headings.length,
    faq: result.faq.length,
    tags: result.tags.length,
    contentLength: result.content.length,
  });
  return result;
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

    // Owners/admins never consume credits, regardless of plan.
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isAdmin = (roleRows ?? []).some(
      (r) => r.role === "owner" || r.role === "admin",
    );

    const unlimited = isAdmin || profile.plan === "premium";
    if (!unlimited && profile.credits <= 0) {
      throw new Error("Você não tem créditos suficientes. Faça upgrade do seu plano.");
    }

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Serviço de IA indisponível no momento.");

    const systemPrompt =
      `Você é um redator especialista em SEO e marketing de conteúdo para blogs (Blogger). ` +
      `Escreva sempre no idioma solicitado e siga EXATAMENTE o formato de saída pedido, ` +
      `sem comentários extras, sem JSON e sem blocos de código.`;

    const userPrompt =
      `Crie um artigo de blog completo e otimizado para SEO.\n` +
      `- Palavra-chave principal: "${data.keyword}"\n` +
      (data.title ? `- Título sugerido: "${data.title}"\n` : "") +
      `- Tamanho aproximado: ${data.wordCount} palavras\n` +
      `- Tom de escrita: ${data.tone}\n` +
      `- Idioma: ${data.language}\n\n` +
      `Responda EXATAMENTE neste formato de texto puro (nada antes do TITLE):\n\n` +
      `TITLE: <título otimizado para SEO, máx 60 caracteres>\n` +
      `META: <meta descrição persuasiva, máx 155 caracteres>\n` +
      `TAGS: <5 a 8 tags separadas por vírgula>\n` +
      `===FAQ===\n` +
      `P: <pergunta 1>\n` +
      `R: <resposta 1>\n` +
      `P: <pergunta 2>\n` +
      `R: <resposta 2>\n` +
      `(gere de 4 a 6 pares de pergunta/resposta)\n` +
      `===CONTENT===\n` +
      `<artigo completo em Markdown, usando ## para H2 e ### para H3, com parágrafos e listas>\n`;

    // Scale token budget with requested length so large articles are not cut.
    const maxTokens = Math.min(24000, Math.max(4000, Math.round(data.wordCount * 6) + 2000));

    let response: Response;
    try {
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
          max_tokens: maxTokens,
          temperature: 0.7,
        }),
      });
    } catch (err) {
      console.error("[article-ai:network-error]", err);
      throw new Error("Falha de conexão com o serviço de IA. Tente novamente.");
    }

    if (response.status === 429) {
      throw new Error("Limite de requisições atingido. Tente novamente em alguns instantes.");
    }
    if (response.status === 402) {
      throw new Error("Créditos de IA do workspace esgotados. Adicione créditos para continuar.");
    }
    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error("[article-ai:gateway-error]", { status: response.status, errText });
      throw new Error("Falha ao gerar o artigo. Tente novamente.");
    }

    const completion = await response.json();
    const choice = completion?.choices?.[0];
    const finishReason: string | undefined = choice?.finish_reason ?? choice?.native_finish_reason;
    const raw: string = choice?.message?.content ?? "";

    logAi("completion", {
      model: completion?.model,
      finishReason,
      usage: completion?.usage,
      contentLength: raw.length,
      maxTokens,
    });

    if (!raw.trim()) {
      throw new Error("A IA não retornou conteúdo. Tente novamente.");
    }

    const parsed = parseDelimitedArticle(raw, finishReason, data.keyword);

    // Persist article
    const { data: inserted, error: insertError } = await supabase
      .from("articles")
      .insert({
        user_id: userId,
        keyword: data.keyword,
        title: parsed.title || data.keyword,
        meta_description: parsed.meta_description || "",
        headings: parsed.headings,
        content: parsed.content || "",
        faq: parsed.faq,
        tags: parsed.tags,
        tone: data.tone,
        language: data.language,
        word_count: data.wordCount,
        status: "draft",
      })
      .select()
      .single();

    if (insertError || !inserted) {
      console.error("[article-ai:insert-error]", insertError);
      throw new Error("Não foi possível salvar o artigo gerado.");
    }

    // Generate AI images (1 featured cover + up to 4 in-content images).
    // Images are FREE — they never affect the user's credits. Failures here
    // must not break article creation, so everything is best-effort.
    let finalArticle = inserted;
    try {
      const { generateArticleImages, embedImagesInContent } = await import(
        "./article-images.server"
      );
      const { featured, internal } = await generateArticleImages({
        apiKey,
        articleId: inserted.id,
        title: parsed.title || data.keyword,
        keyword: data.keyword,
        language: data.language,
        headings: parsed.headings,
        internalCount: 4,
      });

      if (featured || internal.length > 0) {
        const contentWithImages = embedImagesInContent(parsed.content, featured, internal);
        const imagesMeta = [
          ...(featured ? [featured] : []),
          ...internal,
        ].map((img) => ({ url: img.url, alt: img.alt, context: img.context }));
        const { data: updated, error: updateError } = await supabase
          .from("articles")
          .update({
            content: contentWithImages,
            images: imagesMeta,
          })
          .eq("id", inserted.id)
          .select()
          .single();
        if (updateError) {
          console.error("[article-ai:image-update-error]", updateError);
        } else if (updated) {
          finalArticle = updated;
        }
      }
    } catch (imgErr) {
      console.error("[article-ai:image-error]", imgErr);
    }

    // Decrement credit (skip for premium/unlimited).
    // Uses the service-role client because clients are not allowed to update
    // the protected `credits` column on profiles (privilege-escalation guard).
    if (!unlimited) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const newCredits = Math.max(0, profile.credits - 1);
      const { error: creditError } = await supabaseAdmin
        .from("profiles")
        .update({ credits: newCredits })
        .eq("id", userId);
      if (creditError) {
        console.error("[article-ai:credit-error]", creditError);
      }
    }

    return { article: inserted };
  });
