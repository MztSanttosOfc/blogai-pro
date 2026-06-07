import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PageInput = z.object({
  pageType: z.enum(["privacy", "terms", "about", "contact"]),
  blogName: z.string().trim().min(1).max(120),
  blogUrl: z.string().trim().min(3).max(300),
  email: z.string().trim().email().max(200),
});

const PAGE_LABELS: Record<string, string> = {
  privacy: "Política de Privacidade",
  terms: "Termos de Uso",
  about: "Sobre",
  contact: "Contato",
};

/**
 * Generates one of the required legal/informational pages for a Blogger blog
 * using the Lovable AI gateway. Premium-only.
 */
export const generateRequiredPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => PageInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", userId)
      .single();
    if (profile?.plan !== "premium") {
      throw new Error("Recurso exclusivo do plano Premium.");
    }

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Serviço de IA indisponível no momento.");

    const label = PAGE_LABELS[data.pageType];
    const prompt =
      `Gere o conteúdo completo de uma página de "${label}" para um blog.\n` +
      `Nome do blog: ${data.blogName}\n` +
      `URL do blog: ${data.blogUrl}\n` +
      `E-mail de contato: ${data.email}\n\n` +
      `Escreva em português do Brasil, em linguagem clara e profissional, pronto para publicar no Blogger. ` +
      `Use Markdown com títulos (##) e parágrafos. Inclua a data de atualização genérica e seções padrão adequadas ao tipo de página. ` +
      `Para Política de Privacidade e Termos de Uso, inclua cláusulas usuais sobre dados, cookies, responsabilidades e contato. ` +
      `Responda APENAS com o conteúdo em Markdown, sem comentários extras.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você é um redator jurídico e de conteúdo para blogs." },
          { role: "user", content: prompt },
        ],
        max_tokens: 4000,
        temperature: 0.4,
      }),
    });

    if (response.status === 429) throw new Error("Limite de requisições atingido. Tente novamente em instantes.");
    if (response.status === 402) throw new Error("Créditos de IA do workspace esgotados.");
    if (!response.ok) throw new Error("Falha ao gerar a página. Tente novamente.");

    const completion = await response.json();
    const content: string = completion?.choices?.[0]?.message?.content ?? "";
    if (!content.trim()) throw new Error("A IA não retornou conteúdo. Tente novamente.");

    return { label, content };
  });
