import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { findPremiumPage } from "@/lib/premium-tools";

const SlugInput = z.object({ slug: z.string().min(1).max(80) });

export interface PremiumEmbed {
  url: string;
  title: string;
  embeddable: boolean;
  reason?: "x-frame-options" | "csp-frame-ancestors" | "fetch-failed";
}

export interface PremiumReaderContent {
  title: string;
  html: string;
  url: string;
}

/** Gate: allow only Premium plan users and admins. Enforced server-side. */
async function assertPremium(context: {
  supabase: {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }>;
    from: (t: string) => {
      select: (c: string) => {
        eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: { plan?: string } | null }> };
      };
    };
  };
  userId: string;
}) {
  const { supabase, userId } = context;
  const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (isAdmin === true) return;
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .maybeSingle();
  if (profile?.plan !== "premium") {
    throw new Error("Recurso exclusivo para assinantes Premium.");
  }
}

/**
 * Resolve a premium page + probe whether it can be embedded in an iframe.
 * The client uses the same adaptive strategy as the Central de Recompensas
 * (iframe on web / native WebView on Capacitor / reader mode as last resort).
 */
export const getPremiumPageEmbed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SlugInput.parse(input))
  .handler(async ({ data, context }): Promise<PremiumEmbed> => {
    await assertPremium(context as never);
    const page = findPremiumPage(data.slug);
    if (!page) throw new Error("Ferramenta não encontrada.");

    const { assertPublicHttpUrl } = await import("./ssrf-guard");
    let target: URL;
    try {
      target = assertPublicHttpUrl(page.url);
    } catch {
      return { url: page.url, title: page.title, embeddable: false, reason: "fetch-failed" };
    }

    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 6000);
      let res: Response;
      try {
        res = await fetch(target.toString(), {
          method: "GET",
          redirect: "follow",
          headers: { "user-agent": "Mozilla/5.0 (compatible; BlogAIProBot/1.0)", accept: "text/html" },
          signal: ctrl.signal,
        });
      } finally {
        clearTimeout(timer);
      }
      const xfo = (res.headers.get("x-frame-options") || "").toLowerCase();
      if (xfo.includes("deny") || xfo.includes("sameorigin")) {
        return { url: page.url, title: page.title, embeddable: false, reason: "x-frame-options" };
      }
      const csp = (res.headers.get("content-security-policy") || "").toLowerCase();
      const fa = csp.match(/frame-ancestors([^;]*)/);
      if (fa) {
        const val = fa[1].trim();
        if (/'none'|'self'/.test(val) || !/\*|https?:\/\//.test(val)) {
          return { url: page.url, title: page.title, embeddable: false, reason: "csp-frame-ancestors" };
        }
      }
      return { url: page.url, title: page.title, embeddable: true };
    } catch {
      return { url: page.url, title: page.title, embeddable: true, reason: "fetch-failed" };
    }
  });

/** Reader Mode fallback: sanitized HTML of the premium page (Premium/admin only). */
export const getPremiumPageReader = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SlugInput.parse(input))
  .handler(async ({ data, context }): Promise<PremiumReaderContent> => {
    await assertPremium(context as never);
    const page = findPremiumPage(data.slug);
    if (!page) throw new Error("Ferramenta não encontrada.");

    const { fetchReaderHtml } = await import("./rewards.server");
    const reader = await fetchReaderHtml(page.url);
    if (!reader) throw new Error("Não foi possível carregar o conteúdo desta ferramenta.");
    return { title: reader.title || page.title, html: reader.html, url: page.url };
  });
