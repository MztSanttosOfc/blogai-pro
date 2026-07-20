import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SitePageType =
  | "sobre"
  | "contato"
  | "privacidade"
  | "termos"
  | "disclaimer"
  | "cookies";

export const PAGE_TYPES: SitePageType[] = [
  "sobre",
  "contato",
  "privacidade",
  "termos",
  "disclaimer",
  "cookies",
];

/** The 4 essential pages Google AdSense typically requires for approval. */
export const ADSENSE_KIT: SitePageType[] = ["sobre", "contato", "privacidade", "termos"];

export const PAGE_TITLES: Record<SitePageType, string> = {
  sobre: "Sobre Nós",
  contato: "Contato",
  privacidade: "Política de Privacidade",
  termos: "Termos de Uso",
  disclaimer: "Aviso Legal (Disclaimer)",
  cookies: "Política de Cookies",
};

interface SiteSettings {
  blog_name: string;
  owner_name: string;
  contact_email: string;
  domain: string;
  niche: string;
}

const EMPTY_SETTINGS: SiteSettings = {
  blog_name: "",
  owner_name: "",
  contact_email: "",
  domain: "",
  niche: "",
};

/** Build the personalization context block injected into every prompt. */
function settingsBlock(s: SiteSettings): string {
  const lines: string[] = [];
  lines.push(
    `- Nome do blog/site: ${s.blog_name || "(não informado — use um nome genérico como 'nosso site')"}`,
  );
  lines.push(`- Proprietário/Responsável: ${s.owner_name || "(não informado)"}`);
  lines.push(
    `- E-mail de contato: ${s.contact_email || "(não informado — peça que o leitor entre em contato pelo formulário)"}`,
  );
  lines.push(`- Domínio: ${s.domain || "(não informado)"}`);
  lines.push(`- Nicho/Assunto: ${s.niche || "(não informado — conteúdo geral)"}`);
  return lines.join("\n");
}

function promptForType(
  type: SitePageType,
  s: SiteSettings,
  smartCtx: string,
  customLinks: { label: string; url: string }[],
): string {
  const linksBlock = customLinks.length
    ? `\n[Links personalizados do autor — inclua-os naturalmente quando fizer sentido ` +
      `(rodapé, seção "saiba mais", CTA). Formate em Markdown [texto](URL):\n` +
      customLinks.map((l) => `  - ${l.label}: ${l.url}`).join("\n") +
      `\nNunca invente URLs; use apenas as listadas.]\n`
    : "";
  const base =
    `Você é um redator jurídico e de conteúdo especializado em blogs que buscam aprovação no Google AdSense. ` +
    `Escreva em português do Brasil, com tom profissional, claro e confiável. ` +
    `Use Markdown: títulos com ## e ###, parágrafos e listas quando fizer sentido. ` +
    `NÃO inclua o título principal da página (ele já existe). NÃO use blocos de código. ` +
    `Use a data atual quando precisar citar "última atualização". ` +
    `Dados do site para personalização:\n${settingsBlock(s)}\n` +
    smartCtx +
    linksBlock +
    `\n`;

  switch (type) {
    case "sobre":
      return (
        base +
        `Crie uma página "Sobre Nós" envolvente e profissional (350-550 palavras) que apresente o site, ` +
        `sua missão, os valores, o tipo de conteúdo publicado e quem está por trás do projeto. ` +
        `Transmita autoridade e confiança (E-E-A-T), essencial para aprovação no AdSense.`
      );
    case "contato":
      return (
        base +
        `Crie uma página "Contato" profissional que explique como os leitores e anunciantes podem entrar em contato. ` +
        `Inclua o e-mail de contato (se informado), oriente sobre tempo de resposta e mencione parcerias/publicidade. ` +
        `Adicione uma seção curta convidando ao contato. Não invente telefone ou endereço físico.`
      );
    case "privacidade":
      return (
        base +
        `Crie uma "Política de Privacidade" completa e compatível com a LGPD (Lei 13.709/2018) e com as políticas do Google. ` +
        `Cubra: dados coletados, cookies, Google AdSense e cookies DART, anúncios de terceiros, ` +
        `Google Analytics, direitos do titular dos dados, segurança, links externos, consentimento e como entrar em contato. ` +
        `Estruture com seções (##) bem organizadas. Conteúdo pronto para aprovação no AdSense.`
      );
    case "termos":
      return (
        base +
        `Crie "Termos de Uso" abrangentes e profissionais cobrindo: aceitação dos termos, uso do conteúdo, ` +
        `propriedade intelectual e direitos autorais, conduta do usuário, isenção de responsabilidade, ` +
        `links de terceiros, alterações nos termos e legislação aplicável (Brasil). Estruture com seções (##).`
      );
    case "disclaimer":
      return (
        base +
        `Crie um "Aviso Legal (Disclaimer)" profissional informando que o conteúdo é apenas informativo e educativo, ` +
        `isentando o site de responsabilidade por decisões tomadas com base nele, abordando links de afiliados/publicidade, ` +
        `precisão das informações e fontes externas. Estruture com seções (##).`
      );
    case "cookies":
      return (
        base +
        `Crie uma "Política de Cookies" compatível com a LGPD e com as políticas do Google. ` +
        `Explique o que são cookies, os tipos usados (essenciais, desempenho, publicidade), o uso por Google AdSense e parceiros, ` +
        `como gerenciar/desativar cookies no navegador e o consentimento. Estruture com seções (##).`
      );
  }
}

/** Call the Lovable AI gateway and return the generated Markdown content. */
async function generateContent(type: SitePageType, s: SiteSettings): Promise<string> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("Serviço de IA indisponível no momento.");

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
          {
            role: "system",
            content:
              "Você gera páginas institucionais e legais para blogs, em Markdown, prontas para o Google AdSense.",
          },
          { role: "user", content: promptForType(type, s) },
        ],
        max_tokens: 4000,
        temperature: 0.6,
      }),
    });
  } catch (err) {
    console.error("[pages-ai:network-error]", err);
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
    console.error("[pages-ai:gateway-error]", { status: response.status, errText });
    throw new Error("Falha ao gerar a página. Tente novamente.");
  }

  const completion = await response.json();
  let raw: string = completion?.choices?.[0]?.message?.content ?? "";
  raw = raw.trim();
  const fenced = raw.match(/^```[a-zA-Z]*\s*([\s\S]*?)```$/);
  if (fenced) raw = fenced[1].trim();
  if (!raw) throw new Error("A IA não retornou conteúdo. Tente novamente.");
  return raw;
}

async function loadSettings(userId: string): Promise<SiteSettings> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabaseAdmin as any)
    .from("site_settings")
    .select("blog_name, owner_name, contact_email, domain, niche")
    .eq("user_id", userId)
    .maybeSingle();
  return { ...EMPTY_SETTINGS, ...(data ?? {}) };
}

/** Upsert one generated page and return the saved row. */
async function upsertPage(userId: string, type: SitePageType, content: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseAdmin as any)
    .from("site_pages")
    .upsert(
      { user_id: userId, type, title: PAGE_TITLES[type], content, status: "draft" },
      { onConflict: "user_id,type" },
    )
    .select()
    .single();
  if (error) {
    console.error("[pages:upsert-error]", error);
    throw new Error("Não foi possível salvar a página gerada.");
  }
  return data;
}

/** Read the current site settings. */
export const getSiteSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    return { settings: await loadSettings(context.userId) };
  });

/** Save the site settings used to personalize generated pages. */
export const saveSiteSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        blog_name: z.string().trim().max(160).default(""),
        owner_name: z.string().trim().max(160).default(""),
        contact_email: z.string().trim().max(160).default(""),
        domain: z.string().trim().max(200).default(""),
        niche: z.string().trim().max(200).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabaseAdmin as any)
      .from("site_settings")
      .upsert({ user_id: context.userId, ...data }, { onConflict: "user_id" });
    if (error) {
      console.error("[pages:settings-save-error]", error);
      throw new Error("Não foi possível salvar as configurações.");
    }
    return { ok: true };
  });

/** List all of the user's generated pages. */
export const listSitePages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabaseAdmin as any)
      .from("site_pages")
      .select("*")
      .eq("user_id", context.userId);
    return { pages: data ?? [] };
  });

/** Generate (or regenerate) a single page via AI. */
export const generateSitePage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        type: z.enum(["sobre", "contato", "privacidade", "termos", "disclaimer", "cookies"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const settings = await loadSettings(context.userId);
    const content = await generateContent(data.type as SitePageType, settings);
    const page = await upsertPage(context.userId, data.type as SitePageType, content);
    return { page };
  });

/** Generate the full AdSense kit (Sobre, Contato, Privacidade, Termos). */
export const generateAdsenseKit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const settings = await loadSettings(context.userId);
    const pages = [];
    for (const type of ADSENSE_KIT) {
      const content = await generateContent(type, settings);
      pages.push(await upsertPage(context.userId, type, content));
    }
    return { pages };
  });

/** Save manual edits to a page (from the visual editor). */
export const saveSitePage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        type: z.enum(["sobre", "contato", "privacidade", "termos", "disclaimer", "cookies"]),
        title: z.string().trim().min(1).max(200),
        content: z.string().max(60000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: page, error } = await (supabaseAdmin as any)
      .from("site_pages")
      .upsert(
        { user_id: context.userId, type: data.type, title: data.title, content: data.content },
        { onConflict: "user_id,type" },
      )
      .select()
      .single();
    if (error) {
      console.error("[pages:save-error]", error);
      throw new Error("Não foi possível salvar a página.");
    }
    return { page };
  });

/** Delete a page. */
export const deleteSitePage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        type: z.enum(["sobre", "contato", "privacidade", "termos", "disclaimer", "cookies"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabaseAdmin as any)
      .from("site_pages")
      .delete()
      .eq("user_id", context.userId)
      .eq("type", data.type);
    if (error) throw new Error("Não foi possível excluir a página.");
    return { ok: true };
  });

/** Publish (or update) a page directly to the user's selected Blogger blog. */
export const publishSitePageToBlogger = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        type: z.enum(["sobre", "contato", "privacidade", "termos", "disclaimer", "cookies"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getValidBloggerToken, createBloggerPage, updateBloggerPage, markdownToHtml } =
      await import("./blogger.server");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: page } = await (supabaseAdmin as any)
      .from("site_pages")
      .select("*")
      .eq("user_id", userId)
      .eq("type", data.type)
      .maybeSingle();
    if (!page) throw new Error("Página não encontrada. Gere a página primeiro.");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: conn } = await (supabaseAdmin as any)
      .from("blogger_connections")
      .select("selected_blog_id, selected_blog_name")
      .eq("user_id", userId)
      .maybeSingle();
    if (!conn?.selected_blog_id) {
      throw new Error("Selecione um blog de destino na aba Blogger antes de publicar.");
    }

    const token = await getValidBloggerToken(userId);
    const html = markdownToHtml(page.content || "");
    const title = page.title || PAGE_TITLES[data.type as SitePageType];

    const published = page.blogger_post_id
      ? await updateBloggerPage(token, conn.selected_blog_id, page.blogger_post_id, title, html)
      : await createBloggerPage(token, conn.selected_blog_id, title, html);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseAdmin as any)
      .from("site_pages")
      .update({
        status: "published",
        blogger_post_id: published.id,
        blogger_post_url: published.url,
      })
      .eq("user_id", userId)
      .eq("type", data.type);

    return { url: published.url, blogName: conn.selected_blog_name };
  });
