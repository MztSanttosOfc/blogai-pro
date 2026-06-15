import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertPublicHttpUrl } from "./ssrf-guard";

const Input = z.object({ url: z.string().trim().min(3).max(300) });

export interface BlogCheckItem {
  label: string;
  ok: boolean;
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
  // Drop common copy/paste noise.
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
    // Respect the user's chosen protocol first, then fall back.
    push(input);
    const proto = /^https/i.test(input) ? "http" : "https";
    push(`${proto}://${host}${path}`);
  } else {
    push(`https://${host}${path}`);
    push(`http://${host}${path}`);
  }

  // Try toggling the www. prefix as a last resort.
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

    // Handle redirects manually to keep the SSRF guard in the loop.
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
    const viaCloudflare =
      serverHeader.includes("cloudflare") || res.headers.has("cf-ray");

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
    // Cloudflare-specific edge errors (520–527 origin errors, 530 = paired 1XXX).
    // These mean Cloudflare could not reach the origin or challenged the request,
    // not that the user's address is wrong.
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

/** Best-effort sub-resource fetch (sitemap/robots). Never throws. */
async function fetchSubResource(origin: string, path: string): Promise<string | null> {
  const outcome = await fetchPage(`${origin}${path}`, 4);
  return outcome.ok ? outcome.html : null;
}

/**
 * Fetches a blog's homepage HTML and runs heuristic checks for the presence of
 * required pages, sitemap, navigation and content volume. Robust against
 * custom domains, Blogger, WordPress, subdomains, redirects and Cloudflare.
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
      // Don't keep retrying variants for definitive client-side problems.
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
    const html = page.html.toLowerCase();

    const sitemapHtml =
      (await fetchSubResource(origin, "/sitemap.xml")) ??
      (await fetchSubResource(origin, "/sitemap")) ??
      (await fetchSubResource(origin, "/atom.xml")); // Blogger feed fallback
    const robotsHtml = await fetchSubResource(origin, "/robots.txt");
    const sitemapOk = !!sitemapHtml;

    const has = (...terms: string[]) => terms.some((t) => html.includes(t));
    const linkCount = (html.match(/<a\b/g) || []).length;
    const wordCount = html
      .replace(/<script[\s\S]*?<\/script>/g, " ")
      .replace(/<style[\s\S]*?<\/style>/g, " ")
      .replace(/<[^>]+>/g, " ")
      .split(/\s+/)
      .filter(Boolean).length;

    const isBlogger =
      html.includes("blogger") ||
      html.includes("blogspot") ||
      origin.includes("blogspot.com");
    const isWordPress = html.includes("wp-content") || html.includes("wp-json");

    const items: BlogCheckItem[] = [
      {
        label: "Página Sobre",
        ok: has("sobre", "about", "quem somos", "/p/sobre"),
        detail: "Apresenta o autor/projeto e gera confiança.",
      },
      {
        label: "Página Contato",
        ok: has("contato", "contact", "fale conosco", "/p/contato"),
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
        label: "Sitemap / Feed",
        ok: sitemapOk,
        detail: "Ajuda os buscadores a indexar todas as páginas.",
      },
      {
        label: "Robots.txt",
        ok: !!robotsHtml && robotsHtml.length > 0,
        detail: "Orienta os robôs de busca sobre o rastreamento.",
      },
      {
        label: "Estrutura de navegação",
        ok: linkCount >= 8,
        detail: `Foram encontrados ${linkCount} links na página inicial.`,
      },
      {
        label: "Volume de conteúdo",
        ok: wordCount >= 400,
        detail: `Aproximadamente ${wordCount} palavras na página inicial.`,
      },
      {
        label: "Plataforma detectada",
        ok: true,
        detail: isBlogger
          ? "Blogger detectado — compatível com publicação automática."
          : isWordPress
            ? "WordPress detectado."
            : "Plataforma personalizada/CMS próprio.",
      },
    ];

    const passed = items.filter((i) => i.ok).length;
    const score = Math.round((passed / items.length) * 100);

    const recommendations = items
      .filter((i) => !i.ok)
      .map((i) => `Adicione/ajuste: ${i.label}. ${i.detail}`);

    const report = { items, recommendations, finalUrl: page.finalUrl };

    await supabase.from("blog_checks").insert({
      user_id: userId,
      url: data.url,
      score,
      report: report as unknown as import("@/integrations/supabase/types").Json,
    });

    return { score, items, recommendations, finalUrl: page.finalUrl };
  });
