import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface ClusterSatellite {
  title: string;
  angle: string;
  keyword: string;
  searchIntent: string;
}

export interface ClusterPillar {
  title: string;
  description: string;
  keyword: string;
}

export interface ClusterInternalLink {
  from: string;
  to: string;
  anchor: string;
}

export interface GeneratedCluster {
  topic: string;
  pillar: ClusterPillar;
  satellites: ClusterSatellite[];
  primaryKeywords: string[];
  secondaryKeywords: string[];
  internalLinks: ClusterInternalLink[];
  language: string;
}

export interface StoredCluster extends GeneratedCluster {
  id: string;
  created_at: string;
}

const GenerateInput = z.object({
  topic: z.string().min(3).max(160),
  language: z.string().min(2).max(40).default("Português"),
  satelliteCount: z.number().int().min(3).max(10).default(6),
});

const asStr = (v: unknown, f = ""): string => (typeof v === "string" ? v.trim() : f);
const asArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => asStr(x)).filter(Boolean) : [];

function parseJsonObject(raw: string): Record<string, unknown> {
  let text = raw.trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) text = fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("A IA não retornou um cluster válido. Tente novamente.");
  }
  return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
}

/** Generate (without saving) a content cluster architecture with AI. */
export const generateCluster = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GenerateInput.parse(input))
  .handler(async ({ data }): Promise<GeneratedCluster> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Serviço de IA indisponível no momento.");

    const systemPrompt =
      "Você é um estrategista de SEO especialista em topic clusters e autoridade de tópico. " +
      "Responda APENAS com um objeto JSON válido, sem texto extra nem blocos de código. " +
      "Escreva no idioma solicitado.";

    const userPrompt =
      `Tema central: "${data.topic}"\n` +
      `Idioma: ${data.language}\n` +
      `Quantidade de artigos satélites: ${data.satelliteCount}\n\n` +
      "Crie um cluster de conteúdo completo. Retorne EXATAMENTE este JSON:\n" +
      "{\n" +
      '  "pillar": { "title": "título da página pilar (abrangente)", "description": "descrição do que a página pilar cobre", "keyword": "palavra-chave principal do pilar" },\n' +
      `  "satellites": [ ${data.satelliteCount} objetos { "title": "título do artigo satélite", "angle": "ângulo/subtópico coberto", "keyword": "palavra-chave alvo", "searchIntent": "informacional|comercial|transacional|navegacional" } ],\n` +
      '  "primaryKeywords": ["3 a 5 palavras-chave principais do cluster"],\n' +
      '  "secondaryKeywords": ["6 a 10 palavras-chave secundárias/long-tail"],\n' +
      '  "internalLinks": [ objetos { "from": "título de origem", "to": "título de destino", "anchor": "texto âncora sugerido" } representando a malha de links internos entre o pilar e os satélites ]\n' +
      "}";

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
          max_tokens: 3000,
          temperature: 0.7,
          response_format: { type: "json_object" },
        }),
      });
    } catch (err) {
      console.error("[cluster-ai:network-error]", err);
      throw new Error("Falha de conexão com o serviço de IA. Tente novamente.");
    }

    if (response.status === 429)
      throw new Error("Limite de requisições atingido. Tente novamente em instantes.");
    if (response.status === 402) throw new Error("Créditos de IA do workspace esgotados.");
    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error("[cluster-ai:gateway-error]", { status: response.status, errText });
      throw new Error("Não foi possível gerar o cluster. Tente novamente.");
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = payload.choices?.[0]?.message?.content ?? "";
    const obj = parseJsonObject(raw);

    const pillarObj = (obj.pillar ?? {}) as Record<string, unknown>;
    const pillar: ClusterPillar = {
      title: asStr(pillarObj.title, data.topic),
      description: asStr(pillarObj.description),
      keyword: asStr(pillarObj.keyword, data.topic),
    };

    const satellites: ClusterSatellite[] = Array.isArray(obj.satellites)
      ? (obj.satellites as Record<string, unknown>[])
          .map((s) => ({
            title: asStr(s.title),
            angle: asStr(s.angle),
            keyword: asStr(s.keyword),
            searchIntent: asStr(s.searchIntent, "informacional"),
          }))
          .filter((s) => s.title)
      : [];

    const internalLinks: ClusterInternalLink[] = Array.isArray(obj.internalLinks)
      ? (obj.internalLinks as Record<string, unknown>[])
          .map((l) => ({
            from: asStr(l.from),
            to: asStr(l.to),
            anchor: asStr(l.anchor),
          }))
          .filter((l) => l.from && l.to)
      : [];

    return {
      topic: data.topic,
      pillar,
      satellites,
      primaryKeywords: asArr(obj.primaryKeywords),
      secondaryKeywords: asArr(obj.secondaryKeywords),
      internalLinks,
      language: data.language,
    };
  });

const SaveInput = z.object({
  topic: z.string().min(1).max(160),
  language: z.string().min(2).max(40),
  pillar: z.object({
    title: z.string(),
    description: z.string(),
    keyword: z.string(),
  }),
  satellites: z.array(
    z.object({
      title: z.string(),
      angle: z.string(),
      keyword: z.string(),
      searchIntent: z.string(),
    }),
  ),
  primaryKeywords: z.array(z.string()),
  secondaryKeywords: z.array(z.string()),
  internalLinks: z.array(z.object({ from: z.string(), to: z.string(), anchor: z.string() })),
});

/** Persist a generated cluster for later reference. */
export const saveCluster = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SaveInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: inserted, error } = await supabase
      .from("content_clusters")
      .insert({
        user_id: userId,
        topic: data.topic,
        language: data.language,
        pillar: data.pillar,
        satellites: data.satellites,
        primary_keywords: data.primaryKeywords,
        secondary_keywords: data.secondaryKeywords,
        internal_links: data.internalLinks,
      })
      .select("id")
      .single();
    if (error) throw new Error("Não foi possível salvar o cluster.");
    return { id: inserted.id };
  });

/** List the user's saved clusters. */
export const listClusters = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StoredCluster[]> => {
    const { data, error } = await context.supabase
      .from("content_clusters")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error("Não foi possível carregar os clusters.");
    return (data ?? []).map((r) => ({
      id: r.id,
      created_at: r.created_at,
      topic: r.topic,
      language: r.language,
      pillar: r.pillar as unknown as ClusterPillar,
      satellites: (r.satellites as unknown as ClusterSatellite[]) ?? [],
      primaryKeywords: r.primary_keywords ?? [],
      secondaryKeywords: r.secondary_keywords ?? [],
      internalLinks: (r.internal_links as unknown as ClusterInternalLink[]) ?? [],
    }));
  });

/** Delete a saved cluster. */
export const deleteCluster = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("content_clusters").delete().eq("id", data.id);
    if (error) throw new Error("Não foi possível excluir o cluster.");
    return { ok: true };
  });
