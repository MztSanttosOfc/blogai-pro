import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertPublicHttpUrl } from "./ssrf-guard";

const Input = z.object({ url: z.string().trim().min(3).max(300) });

export interface BlogCheckItem {
  label: string;
  ok: boolean;
  /** Partial credit 0..1 used for the weighted score. */
  score: number;
  /** Relative weight of this criterion in the final grade. */
  weight: number;
  /** Audit grouping shown in the UI. */
  category: "Estrutura" | "Conteúdo" | "SEO Técnico" | "Performance";
  detail: string;
}

// A realistic desktop-Chrome User-Agent. Cloudflare and other WAFs frequently
// challenge or block requests that advertise a bot UA, returning 403/503/530.
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/**
 * Normalize a user-supplied address into a list of candidate URLs to try,
 * in priority order. Handles missing protocol, www/non-www and trailing slash.
 */
function buildCandidates(raw: string): string[] {
  let input = raw.trim();
  input = input.replace(/\s+/g, "");

  const hasProtocol = /^https?:\/\//i.test(input);
  const withoutProtocol = input.replace(/^https?:\/\//i, "");
  const host = withoutProtocol.split("/")[0].toLowerCase();
  const path = withoutProtocol.slice(host.length);

  const candidates: string[] = [];
  const push = (u: string) => {
    if (!candidates.includes(u)) candidates.push(u);
  };

  if (hasProtocol) {
    push(input);
    const proto = /^https/i.test(input) ? "http" : "https";
    push(`${proto}://${host}${path}`);
  } else {
    push(`https://${host}${path}`);
    push(`http://${host}${path}`);
  }

  const altHost = host.startsWith("www.") ? host.slice(4) : `www.${host}`;
  push(`https://${altHost}${path}`);

  return candidates;
}

type FetchOutcome =
  | { ok: true; finalUrl: string; html: string }
  | { ok: false; code: string; message: string };

/**
 * Fetch a URL while manually following redirects (301/302/307/308) so each hop
 * can be re-validated by the SSRF guard. Returns a structured outcome with a
 * specific, user-facing error message instead of a generic failure.
 */
async function fetchPage(rawUrl: string, maxRedirects = 6): Promise<FetchOutcome> {
  let current: URL;
  try {
    current = assertPublicHttpUrl(rawUrl);
  } catch (e) {
    return {
      ok: false,
      code: "INVALID",
      message: e instanceof Error ? e.message : "URL inválida.",
    };
  }

  for (let hop = 0; hop <= maxRedirects; hop++) {
    let res: Response;
    try {
      res = await fetch(current.toString(), {
        method: "GET",
        headers: {
          "User-Agent": USER_AGENT,
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
          "Cache-Control": "no-cache",
          "Upgrade-Insecure-Requests": "1",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Sec-Fetch-User": "?1",
        },
        redirect: "manual",
        signal: AbortSignal.timeout(15000),
      });
    } catch (err) {
      const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
      if (msg.includes("timeout") || msg.includes("aborted") || msg.includes("timed out")) {
        return {
          ok: false,
          code: "TIMEOUT",
          message: "O site demorou demais para responder (timeout de 15s).",
        };
      }
      if (
        msg.includes("certificate") ||
        msg.includes("ssl") ||
        msg.includes("tls") ||
        msg.includes("self-signed") ||
        msg.includes("err_cert")
      ) {
        return {
          ok: false,
          code: "SSL",
          message: "O certificado SSL do site é inválido ou não pôde ser verificado.",
        };
      }
      if (
        msg.includes("enotfound") ||
        msg.includes("dns") ||
        msg.includes("getaddrinfo") ||
        msg.includes("name not resolved")
      ) {
        return {
          ok: false,
          code: "DNS",
          message: "O domínio não foi encontrado (falha de DNS). Verifique o endereço.",
        };
      }
      return { ok: false, code: "NETWORK", message: "Não foi possível conectar ao site." };
    }

    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const location = res.headers.get("location");
      if (!location) {
        return {
          ok: false,
          code: "REDIRECT",
          message: "O site respondeu com um redirecionamento inválido.",
        };
      }
      let nextUrl: URL;
      try {
        nextUrl = new URL(location, current);
        assertPublicHttpUrl(nextUrl.toString());
      } catch {
        return {
          ok: false,
          code: "REDIRECT",
          message: "O site redirecionou para um endereço não permitido.",
        };
      }
      current = nextUrl;
      continue;
    }

    const serverHeader = (res.headers.get("server") || "").toLowerCase();
    const viaCloudflare = serverHeader.includes("cloudflare") || res.headers.has("cf-ray");

    if (res.status === 403 || res.status === 401) {
      return {
        ok: false,
        code: "BLOCKED",
        message: viaCloudflare
          ? "O site está protegido pelo Cloudflare e bloqueou a verificação automática (desafio anti-bot). O blog funciona normalmente para visitantes."
          : "O site bloqueou o acesso do verificador (proteção anti-bot / firewall). Tente novamente mais tarde.",
      };
    }
    if (res.status === 429) {
      return {
        ok: false,
        code: "RATE_LIMIT",
        message: "O site limitou as requisições (429). Aguarde e tente novamente.",
      };
    }
    if (res.status >= 520 && res.status <= 530) {
      return {
        ok: false,
        code: "CLOUDFLARE",
        message:
          `O Cloudflare não conseguiu acessar o servidor de origem do site (erro ${res.status}). ` +
          "Geralmente é um problema temporário do servidor ou do desafio anti-bot — o blog costuma abrir normalmente no navegador.",
      };
    }
    if (res.status === 503) {
      return {
        ok: false,
        code: viaCloudflare ? "CLOUDFLARE" : "SERVER",
        message: viaCloudflare
          ? "O Cloudflare exibiu um desafio de verificação (503) e impediu a leitura automática do site."
          : "O site está temporariamente indisponível (503). Tente novamente mais tarde.",
      };
    }
    if (res.status >= 500) {
      return {
        ok: false,
        code: "SERVER",
        message: `O site retornou um erro de servidor (${res.status}).`,
      };
    }
    if (res.status === 404) {
      return {
        ok: false,
        code: "NOT_FOUND",
        message: "A página não foi encontrada (404). Verifique o endereço.",
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        code: "HTTP",
        message: `O site retornou um status inesperado (${res.status}).`,
      };
    }

    const html = await res.text().catch(() => "");
    return { ok: true, finalUrl: current.toString(), html };
  }

  return {
    ok: false,
    code: "REDIRECT_LOOP",
    message: "O site entrou em um loop de redirecionamentos.",
  };
}

/** Best-effort sub-resource fetch (sitemap/robots/article). Never throws. */
async function fetchSubResource(url: string): Promise<string | null> {
  const outcome = await fetchPage(url, 4);
  return outcome.ok ? outcome.html : null;
}

// ---------------------------------------------------------------------------
// HTML extraction helpers (operate on the original-case HTML).
// ---------------------------------------------------------------------------

function getTitle(raw: string): string {
  const m = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? m[1].replace(/\s+/g, " ").trim() : "";
}

function getMeta(raw: string, key: string): string {
  // Matches name="key" or property="key" regardless of attribute order.
  const re = new RegExp(
    `<meta[^>]+(?:name|property)\\s*=\\s*["']${key}["'][^>]*>`,
    "i",
  );
  const tag = raw.match(re);
  if (!tag) return "";
  const c = tag[0].match(/content\s*=\s*["']([\s\S]*?)["']/i);
  return c ? c[1].replace(/\s+/g, " ").trim() : "";
}

function countMatches(raw: string, re: RegExp): number {
  return (raw.match(re) || []).length;
}

function plainTextWordCount(raw: string): number {
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .split(/\s+/)
    .filter(Boolean).length;
}

/** Pull all <loc> values out of a sitemap (index or urlset). */
function extractLocs(xml: string): string[] {
  const locs: string[] = [];
  const re = /<loc>\s*([\s\S]*?)\s*<\/loc>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const u = m[1].trim();
    if (/^https?:\/\//i.test(u)) locs.push(u);
  }
  return locs;
}

/** Pull <lastmod> dates out of a sitemap. */
function extractLastmods(xml: string): Date[] {
  const dates: Date[] = [];
  const re = /<lastmod>\s*([\s\S]*?)\s*<\/lastmod>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const d = new Date(m[1].trim());
    if (!isNaN(d.getTime())) dates.push(d);
  }
  return dates;
}

function isLikelyArticleUrl(u: string): boolean {
  // Posts usually contain a year or .html (Blogger) or a deeper path.
  return (
    /\/20\d{2}\//.test(u) ||
    /\.html?($|\?)/i.test(u) ||
    /\/(post|artigo|blog|p)\//i.test(u) ||
    u.replace(/^https?:\/\/[^/]+/, "").split("/").filter(Boolean).length >= 2
  );
}

/**
 * Builds a professional, weighted SEO audit of a blog. Beyond the homepage it
 * samples recent articles, inspects the sitemap/robots, structured data, meta
 * tags, headings, images and links. Robust against custom domains, Blogger,
 * WordPress, subdomains, redirects and Cloudflare. Premium-only.
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
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isAdmin = (roleRows ?? []).some(
      (r) => r.role === "owner" || r.role === "admin",
    );
    if (!isAdmin && profile?.plan !== "premium") {
      throw new Error("Recurso exclusivo do plano Premium.");
    }

    const candidates = buildCandidates(data.url);
    let page: FetchOutcome | null = null;
    let lastError: { code: string; message: string } | null = null;

    for (const candidate of candidates) {
      const outcome = await fetchPage(candidate);
      if (outcome.ok) {
        page = outcome;
        break;
      }
      lastError = { code: outcome.code, message: outcome.message };
      if (["INVALID", "BLOCKED", "TIMEOUT"].includes(outcome.code)) break;
    }

    if (!page || !page.ok) {
      throw new Error(
        lastError?.message ??
          "Não foi possível acessar a URL informada. Verifique o endereço.",
      );
    }

    const finalUrl = new URL(page.finalUrl);
    const origin = finalUrl.origin;
    const host = finalUrl.hostname.replace(/^www\./, "");
    const raw = page.html;
    const html = raw.toLowerCase();

    // --- Sub-resources -----------------------------------------------------
    const robotsHtml = await fetchSubResource(`${origin}/robots.txt`);
    let sitemapXml =
      (await fetchSubResource(`${origin}/sitemap.xml`)) ??
      (await fetchSubResource(`${origin}/sitemap-index.xml`)) ??
      (await fetchSubResource(`${origin}/sitemap`));
    const atomXml = sitemapXml ? null : await fetchSubResource(`${origin}/atom.xml`);

    // Resolve sitemap indexes one level deep to reach real article URLs.
    let locs: string[] = [];
    let lastmods: Date[] = [];
    if (sitemapXml) {
      locs = extractLocs(sitemapXml);
      lastmods = extractLastmods(sitemapXml);
      const isIndex = /<sitemapindex/i.test(sitemapXml);
      if (isIndex && locs.length) {
        // Prefer a sub-sitemap that looks like it holds posts.
        const sub =
          locs.find((u) => /post|article|blog/i.test(u)) ?? locs[0];
        const subXml = await fetchSubResource(sub);
        if (subXml) {
          locs = extractLocs(subXml);
          lastmods = extractLastmods(subXml);
        }
      }
    } else if (atomXml) {
      // Blogger Atom feed: <link rel="alternate" href="...">
      const re = /<link[^>]+rel=["']alternate["'][^>]+href=["']([^"']+)["']/gi;
      let m: RegExpExecArray | null;
      while ((m = re.exec(atomXml)) !== null) locs.push(m[1]);
      const dre = /<(?:published|updated)>\s*([\s\S]*?)\s*<\/(?:published|updated)>/gi;
      while ((m = dre.exec(atomXml)) !== null) {
        const d = new Date(m[1].trim());
        if (!isNaN(d.getTime())) lastmods.push(d);
      }
    }

    const sitemapOk = !!(sitemapXml || atomXml);
    const articleUrls = locs.filter(isLikelyArticleUrl);
    const articleCount = articleUrls.length || locs.length;

    // --- Sample recent articles -------------------------------------------
    const sample = articleUrls.slice(0, 3);
    const articleStats: { words: number; h2: number; imgs: number }[] = [];
    for (const u of sample) {
      const articleHtml = await fetchSubResource(u);
      if (!articleHtml) continue;
      articleStats.push({
        words: plainTextWordCount(articleHtml),
        h2: countMatches(articleHtml, /<h2\b/gi),
        imgs: countMatches(articleHtml, /<img\b/gi),
      });
    }
    const avgWords =
      articleStats.length > 0
        ? Math.round(
            articleStats.reduce((s, a) => s + a.words, 0) / articleStats.length,
          )
        : plainTextWordCount(raw); // fallback to homepage when no sample

    // --- Homepage signals --------------------------------------------------
    const has = (...terms: string[]) => terms.some((t) => html.includes(t));
    const title = getTitle(raw);
    const metaDesc = getMeta(raw, "description");
    const ogTitle = getMeta(raw, "og:title");
    const ogImage = getMeta(raw, "og:image");
    const ogDesc = getMeta(raw, "og:description");
    const canonical = /<link[^>]+rel=["']canonical["']/i.test(raw);
    const viewport = /<meta[^>]+name=["']viewport["']/i.test(raw);
    const jsonLd = countMatches(raw, /<script[^>]+application\/ld\+json/gi) > 0;

    const h1 = countMatches(raw, /<h1\b/gi);
    const h2 = countMatches(raw, /<h2\b/gi);
    const h3 = countMatches(raw, /<h3\b/gi);

    const imgTags = raw.match(/<img\b[^>]*>/gi) || [];
    const imgsWithAlt = imgTags.filter((t) => /\balt\s*=\s*["'][^"']+["']/i.test(t)).length;
    const altRatio = imgTags.length > 0 ? imgsWithAlt / imgTags.length : 1;

    const anchors = raw.match(/<a\b[^>]*href=["']([^"']+)["']/gi) || [];
    let internalLinks = 0;
    let externalLinks = 0;
    for (const a of anchors) {
      const href = (a.match(/href=["']([^"']+)["']/i) || [])[1] || "";
      if (/^https?:\/\//i.test(href)) {
        if (href.toLowerCase().includes(host)) internalLinks++;
        else externalLinks++;
      } else if (href.startsWith("/")) {
        internalLinks++;
      }
    }

    // Publishing frequency from sitemap dates (posts in the last 90 days).
    let postsPer90 = 0;
    let lastPostLabel = "sem dados de data";
    if (lastmods.length) {
      const now = Date.now();
      postsPer90 = lastmods.filter(
        (d) => now - d.getTime() <= 90 * 24 * 3600 * 1000,
      ).length;
      const newest = lastmods.reduce((a, b) => (a > b ? a : b));
      const days = Math.round((now - newest.getTime()) / (24 * 3600 * 1000));
      lastPostLabel = days <= 1 ? "hoje" : `há ${days} dia(s)`;
    }

    // Basic performance heuristic from homepage weight.
    const htmlKb = Math.round(raw.length / 1024);
    const scriptCount = countMatches(raw, /<script\b/gi);

    const isBlogger =
      html.includes("blogger") ||
      html.includes("blogspot") ||
      origin.includes("blogspot.com");
    const isWordPress = html.includes("wp-content") || html.includes("wp-json");

    // --- Weighted criteria -------------------------------------------------
    const clamp = (n: number) => Math.max(0, Math.min(1, n));
    const items: BlogCheckItem[] = [
      // Estrutura
      {
        label: "Páginas institucionais",
        category: "Estrutura",
        weight: 6,
        score: clamp(
          [
            has("sobre", "about", "quem somos"),
            has("contato", "contact", "fale conosco"),
            has("política de privacidade", "privacy policy", "privacidade"),
            has("termos de uso", "terms of", "termos e condições"),
          ].filter(Boolean).length / 4,
        ),
        ok: false,
        detail: "Sobre, Contato, Privacidade e Termos aumentam a confiança e ajudam na monetização.",
      },
      {
        label: "Quantidade de artigos",
        category: "Estrutura",
        weight: 8,
        score: clamp(articleCount / 30),
        ok: articleCount >= 10,
        detail: `${articleCount} artigo(s) detectado(s) no sitemap/feed.`,
      },
      {
        label: "Frequência de publicação",
        category: "Estrutura",
        weight: 6,
        score: clamp(postsPer90 / 6),
        ok: postsPer90 >= 3,
        detail: `${postsPer90} publicação(ões) nos últimos 90 dias · última ${lastPostLabel}.`,
      },
      {
        label: "Estrutura de navegação",
        category: "Estrutura",
        weight: 4,
        score: clamp((internalLinks + externalLinks) / 15),
        ok: internalLinks + externalLinks >= 8,
        detail: `${anchors.length} links na home (${internalLinks} internos, ${externalLinks} externos).`,
      },

      // Conteúdo
      {
        label: "Profundidade dos artigos",
        category: "Conteúdo",
        weight: 10,
        score: clamp(avgWords / 1200),
        ok: avgWords >= 600,
        detail:
          articleStats.length > 0
            ? `Média de ${avgWords} palavras em ${articleStats.length} artigo(s) recente(s).`
            : `~${avgWords} palavras estimadas (amostra de artigos indisponível, usando a home).`,
      },
      {
        label: "Qualidade dos títulos",
        category: "Conteúdo",
        weight: 6,
        score: clamp(
          (title.length >= 25 && title.length <= 65 ? 0.6 : 0.3) +
            (title && title.toLowerCase() !== host ? 0.4 : 0),
        ),
        ok: title.length >= 20 && title.length <= 70,
        detail: title
          ? `Title com ${title.length} caracteres: "${title.slice(0, 70)}".`
          : "Nenhum <title> encontrado.",
      },
      {
        label: "Links internos",
        category: "Conteúdo",
        weight: 5,
        score: clamp(internalLinks / 10),
        ok: internalLinks >= 5,
        detail: `${internalLinks} links internos — essenciais para SEO e tempo de permanência.`,
      },
      {
        label: "Links externos",
        category: "Conteúdo",
        weight: 3,
        score: clamp(externalLinks / 3),
        ok: externalLinks >= 1,
        detail: `${externalLinks} links externos — referências aumentam a credibilidade.`,
      },
      {
        label: "Imagens com ALT text",
        category: "Conteúdo",
        weight: 5,
        score: clamp(altRatio),
        ok: altRatio >= 0.7,
        detail:
          imgTags.length > 0
            ? `${imgsWithAlt}/${imgTags.length} imagens com ALT (${Math.round(altRatio * 100)}%).`
            : "Nenhuma imagem detectada na home.",
      },

      // SEO Técnico
      {
        label: "Headings (H1/H2/H3)",
        category: "SEO Técnico",
        weight: 7,
        score: clamp((h1 === 1 ? 0.4 : h1 > 1 ? 0.2 : 0) + (h2 >= 1 ? 0.4 : 0) + (h3 >= 1 ? 0.2 : 0)),
        ok: h1 >= 1 && h2 >= 1,
        detail: `H1: ${h1} · H2: ${h2} · H3: ${h3}. Ideal: 1 H1 e vários H2/H3.`,
      },
      {
        label: "Meta Description",
        category: "SEO Técnico",
        weight: 6,
        score: clamp(metaDesc.length >= 80 && metaDesc.length <= 165 ? 1 : metaDesc ? 0.5 : 0),
        ok: metaDesc.length >= 50,
        detail: metaDesc
          ? `Meta description com ${metaDesc.length} caracteres.`
          : "Meta description ausente.",
      },
      {
        label: "Open Graph",
        category: "SEO Técnico",
        weight: 5,
        score: clamp([!!ogTitle, !!ogDesc, !!ogImage].filter(Boolean).length / 3),
        ok: !!(ogTitle && ogImage),
        detail: `og:title ${ogTitle ? "✓" : "✗"} · og:description ${ogDesc ? "✓" : "✗"} · og:image ${ogImage ? "✓" : "✗"}.`,
      },
      {
        label: "Dados estruturados (JSON-LD)",
        category: "SEO Técnico",
        weight: 5,
        score: jsonLd ? 1 : 0,
        ok: jsonLd,
        detail: jsonLd
          ? "Schema.org JSON-LD presente — melhora os rich results."
          : "Sem dados estruturados JSON-LD.",
      },
      {
        label: "Canonical URL",
        category: "SEO Técnico",
        weight: 4,
        score: canonical ? 1 : 0,
        ok: canonical,
        detail: canonical
          ? "Tag canonical presente — evita conteúdo duplicado."
          : "Tag canonical ausente.",
      },
      {
        label: "Sitemap indexável",
        category: "SEO Técnico",
        weight: 6,
        score: sitemapOk ? 1 : 0,
        ok: sitemapOk,
        detail: sitemapOk
          ? `Sitemap/feed encontrado com ${locs.length} URL(s).`
          : "Nenhum sitemap.xml ou feed acessível.",
      },
      {
        label: "Robots.txt",
        category: "SEO Técnico",
        weight: 3,
        score: robotsHtml && robotsHtml.length > 0 ? 1 : 0,
        ok: !!robotsHtml && robotsHtml.length > 0,
        detail: robotsHtml
          ? "robots.txt acessível."
          : "robots.txt não encontrado.",
      },

      // Performance
      {
        label: "Compatibilidade mobile",
        category: "Performance",
        weight: 6,
        score: viewport ? 1 : 0,
        ok: viewport,
        detail: viewport
          ? "Meta viewport presente — layout responsivo."
          : "Meta viewport ausente — risco de layout não responsivo.",
      },
      {
        label: "Performance básica",
        category: "Performance",
        weight: 5,
        score: clamp(1 - Math.max(0, htmlKb - 100) / 400) * clamp(1 - Math.max(0, scriptCount - 10) / 30),
        ok: htmlKb <= 250 && scriptCount <= 25,
        detail: `HTML ~${htmlKb}KB · ${scriptCount} scripts na home.`,
      },
    ];

    // Derive the boolean "ok" for the institutional pages criterion.
    items[0].ok = items[0].score >= 0.75;

    const totalWeight = items.reduce((s, i) => s + i.weight, 0);
    const weighted = items.reduce((s, i) => s + i.score * i.weight, 0);
    const score = Math.round((weighted / totalWeight) * 100);

    const recommendations = items
      .filter((i) => i.score < 0.7)
      .sort((a, b) => b.weight - a.weight)
      .map((i) => `[${i.category}] ${i.label}: ${i.detail}`);

    const platform = isBlogger
      ? "Blogger"
      : isWordPress
        ? "WordPress"
        : "CMS/personalizado";

    const report = {
      items,
      recommendations,
      finalUrl: page.finalUrl,
      platform,
      articleCount,
      avgWords,
    };

    await supabase.from("blog_checks").insert({
      user_id: userId,
      url: data.url,
      score,
      report: report as unknown as import("@/integrations/supabase/types").Json,
    });

    return {
      score,
      items,
      recommendations,
      finalUrl: page.finalUrl,
      platform,
      articleCount,
      avgWords,
    };
  });
