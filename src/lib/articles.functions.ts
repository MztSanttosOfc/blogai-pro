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

    if (!raw.trim()) {
      throw new Error("A IA não retornou conteúdo. Tente novamente.");
    }

    const parsed = parseArticleJson(raw, finishReason);

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
