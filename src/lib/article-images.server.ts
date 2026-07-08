/**
 * Server-only helpers for generating article images via Lovable AI and
 * storing them in the private `article-images` bucket.
 *
 * Images are served through long-lived signed URLs (absolute URLs that work
 * both inside the app and when the article is published to Blogger). The
 * upload + signing run with the service-role admin client, bypassing RLS.
 *
 * Performance / SEO strategy (Core Web Vitals + Blogger/Google Images):
 *  - Featured cover rendered at 1536x1024 (3:2) — ideal for OG/Blogger headers.
 *  - In-content images rendered at 1024x1024 (1:1) — light and responsive.
 *  - Generated with `quality: "low"` to keep file weight small (~60-110 KB).
 *  - Embedded as real <img> tags carrying width/height (no layout shift / CLS),
 *    loading="lazy" and decoding="async" (no render-blocking) and responsive
 *    inline sizing for desktop AND mobile. These attributes survive the
 *    Markdown -> HTML conversion and reach Blogger intact.
 *
 * This module is `.server.ts` so it never ships to the client bundle. Import
 * it only from inside server-function handlers.
 */

const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 10; // ~10 years

interface GeneratedImage {
  url: string;
  alt: string;
  /** "featured" or the heading the internal image illustrates. */
  context: string;
  width: number;
  height: number;
}

/**
 * Generate a single image from a text prompt and return its base64 PNG.
 * Returns null on any failure (network, moderation, gateway error) so the
 * caller can continue without images instead of failing the whole article.
 */
async function generateImageB64(
  apiKey: string,
  prompt: string,
  size: "1024x1024" | "1536x1024",
): Promise<string | null> {
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-image-2",
        prompt,
        quality: "low",
        size,
        n: 1,
      }),
      signal: AbortSignal.timeout(50000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("[article-image:gateway-error]", {
        status: res.status,
        errText: errText.slice(0, 400),
      });
      return null;
    }

    const json = await res.json();
    const b64: string | undefined = json?.data?.[0]?.b64_json;
    if (!b64) {
      console.error("[article-image:no-data]", { keys: Object.keys(json ?? {}) });
      return null;
    }
    return b64;
  } catch (err) {
    console.error("[article-image:exception]", err);
    return null;
  }
}

/** Upload a base64 PNG to the private bucket and return a long-lived signed URL. */
async function uploadAndSign(articleId: string, name: string, b64: string): Promise<string | null> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const bytes = Buffer.from(b64, "base64");
    const path = `${articleId}/${name}.png`;

    const { error: upErr } = await supabaseAdmin.storage
      .from("article-images")
      .upload(path, bytes, { contentType: "image/png", upsert: true });
    if (upErr) {
      console.error("[article-image:upload-error]", upErr);
      return null;
    }

    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from("article-images")
      .createSignedUrl(path, SIGNED_URL_TTL);
    if (signErr || !signed?.signedUrl) {
      console.error("[article-image:sign-error]", signErr);
      return null;
    }
    return signed.signedUrl;
  } catch (err) {
    console.error("[article-image:upload-exception]", err);
    return null;
  }
}

const stylePrompt =
  "Professional editorial blog illustration, clean modern and futuristic flat design, " +
  "tech-forward aesthetic, soft cinematic lighting, vibrant but tasteful colors, " +
  "high quality, sharp focus, no text, no watermark, no logos, no letters.";

/**
 * Generate a featured cover image plus up to `internalCount` in-content images
 * for an article. Returns the produced images (may be empty if generation is
 * unavailable). Never throws — image failures must not break article creation.
 */
export async function generateArticleImages(opts: {
  apiKey: string;
  articleId: string;
  title: string;
  keyword: string;
  language: string;
  headings: { type: "h2" | "h3"; text: string }[];
  internalCount: number;
}): Promise<{ featured: GeneratedImage | null; internal: GeneratedImage[] }> {
  const { apiKey, articleId, title, keyword, language, headings, internalCount } = opts;

  // Pick up to `internalCount` distinct H2 sections to illustrate.
  const h2s = headings.filter((h) => h.type === "h2").map((h) => h.text);
  const sections = h2s.slice(0, internalCount);

  // Build prompts.
  const featuredPrompt =
    `${stylePrompt} Wide cover image for a blog article titled "${title}" about "${keyword}". ` +
    `Theme language context: ${language}.`;

  // Generate featured + internal images in parallel for speed.
  const [featuredB64, ...sectionB64s] = await Promise.all([
    generateImageB64(apiKey, featuredPrompt, "1536x1024"),
    ...sections.map((section) =>
      generateImageB64(
        apiKey,
        `${stylePrompt} Illustration for the section "${section}" of a blog article about "${keyword}".`,
        "1024x1024",
      ),
    ),
  ]);

  let featured: GeneratedImage | null = null;
  if (featuredB64) {
    const url = await uploadAndSign(articleId, "featured", featuredB64);
    if (url) featured = { url, alt: title, context: "featured", width: 1536, height: 1024 };
  }

  const internal: GeneratedImage[] = [];
  for (let i = 0; i < sections.length; i++) {
    const b64 = sectionB64s[i];
    if (!b64) continue;
    const url = await uploadAndSign(articleId, `section-${i + 1}`, b64);
    if (url)
      internal.push({ url, alt: sections[i], context: sections[i], width: 1024, height: 1024 });
  }

  return { featured, internal };
}

/** Escape a string for safe use inside an HTML attribute. */
function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Build a Core-Web-Vitals-friendly <img> tag:
 *  - width/height attributes reserve space -> no CLS.
 *  - loading="lazy" + decoding="async" -> no render-blocking, faster LCP.
 *  - responsive inline style -> looks correct on desktop and mobile.
 * Raw HTML survives the Markdown->HTML step and reaches Blogger intact.
 */
function imgTag(img: GeneratedImage, eager: boolean): string {
  const alt = escapeAttr(img.alt || "");
  const src = escapeAttr(img.url);
  const loading = eager ? "eager" : "lazy";
  const fetchpriority = eager ? ' fetchpriority="high"' : "";
  return (
    `<img src="${src}" alt="${alt}" width="${img.width}" height="${img.height}" ` +
    `loading="${loading}" decoding="async"${fetchpriority} ` +
    `style="width:100%;height:auto;border-radius:12px;margin:1.25rem 0;" />`
  );
}

/**
 * Embed the generated images into the Markdown content: the featured image at
 * the very top, then each internal image right after its matching H2 heading.
 * Images are emitted as real <img> tags (see imgTag) for best CLS/SEO results.
 */
export function embedImagesInContent(
  content: string,
  featured: GeneratedImage | null,
  internal: GeneratedImage[],
): string {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];

  // Map heading text -> image for quick lookup.
  const byHeading = new Map<string, GeneratedImage>();
  for (const img of internal) byHeading.set(img.context.trim().toLowerCase(), img);
  const used = new Set<string>();

  for (const rawLine of lines) {
    out.push(rawLine);
    const h2 = rawLine.trim().match(/^##\s+(.*)$/);
    if (h2) {
      const key = h2[1].trim().toLowerCase();
      const img = byHeading.get(key);
      if (img && !used.has(key)) {
        used.add(key);
        out.push("", imgTag(img, false), "");
      }
    }
  }

  let body = out.join("\n");

  // Any internal images whose heading wasn't matched: append in order so none
  // are silently dropped.
  for (const img of internal) {
    const key = img.context.trim().toLowerCase();
    if (!used.has(key)) {
      body += `\n\n${imgTag(img, false)}\n`;
    }
  }

  // Featured image first; eager-loaded as the LCP candidate.
  if (featured) {
    body = `${imgTag(featured, true)}\n\n${body}`;
  }

  return body;
}
