import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({ url: z.string().trim().url().max(300) });

export interface BlogCheckItem {
  label: string;
  ok: boolean;
  detail: string;
}

/**
 * Fetches a blog's homepage HTML and runs heuristic checks for the presence of
 * required pages, sitemap, navigation and content volume. Orientative only.
 * Premium-only.
 */
export const analyzeBlog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
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

    let html = "";
    let robots = "";
    let sitemapOk = false;
    try {
      const res = await fetch(data.url, {
        headers: { "User-Agent": "Mozilla/5.0 BlogAI-Pro-Checker" },
        signal: AbortSignal.timeout(15000),
      });
      html = (await res.text()).toLowerCase();
    } catch {
      throw new Error("Não foi possível acessar a URL informada. Verifique o endereço.");
    }

    const origin = (() => {
      try {
        return new URL(data.url).origin;
      } catch {
        return data.url.replace(/\/$/, "");
      }
    })();

    try {
      const r = await fetch(`${origin}/sitemap.xml`, { signal: AbortSignal.timeout(10000) });
      sitemapOk = r.ok;
    } catch {
      sitemapOk = false;
    }
    try {
      const r = await fetch(`${origin}/robots.txt`, { signal: AbortSignal.timeout(10000) });
      if (r.ok) robots = (await r.text()).toLowerCase();
    } catch {
      robots = "";
    }

    const has = (...terms: string[]) => terms.some((t) => html.includes(t));
    const linkCount = (html.match(/<a /g) || []).length;
    const wordCount = html
      .replace(/<[^>]+>/g, " ")
      .split(/\s+/)
      .filter(Boolean).length;

    const items: BlogCheckItem[] = [
      {
        label: "Página Sobre",
        ok: has("sobre", "about", "quem somos"),
        detail: "Apresenta o autor/projeto e gera confiança.",
      },
      {
        label: "Página Contato",
        ok: has("contato", "contact", "fale conosco"),
        detail: "Permite que leitores e anunciantes entrem em contato.",
      },
      {
        label: "Política de Privacidade",
        ok: has("política de privacidade", "privacy policy", "privacidade"),
        detail: "Página essencial para um blog profissional.",
      },
      {
        label: "Termos de Uso",
        ok: has("termos de uso", "terms of", "termos e condições"),
        detail: "Define regras de uso do conteúdo.",
      },
      {
        label: "Sitemap",
        ok: sitemapOk,
        detail: "Ajuda os buscadores a indexar todas as páginas.",
      },
      {
        label: "Robots.txt",
        ok: robots.length > 0,
        detail: "Orienta os robôs de busca sobre o rastreamento.",
      },
      {
        label: "Estrutura de navegação",
        ok: linkCount >= 8,
        detail: `Foram encontrados ${linkCount} links de navegação.`,
      },
      {
        label: "Volume de conteúdo",
        ok: wordCount >= 400,
        detail: `Aproximadamente ${wordCount} palavras na página inicial.`,
      },
    ];

    const passed = items.filter((i) => i.ok).length;
    const score = Math.round((passed / items.length) * 100);

    const recommendations = items
      .filter((i) => !i.ok)
      .map((i) => `Adicione/ajuste: ${i.label}. ${i.detail}`);

    const report = { items, recommendations };

    await supabase.from("blog_checks").insert({
      user_id: userId,
      url: data.url,
      score,
      report: report as unknown as Record<string, unknown>,
    });

    return { score, items, recommendations };
  });
