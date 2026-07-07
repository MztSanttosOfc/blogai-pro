/**
 * Client-safe text sanitization helpers shared by the server (import time) and
 * the UI (render time). The goal is that NO raw HTML — tags, entities, scripts,
 * URLs or code fragments — ever reaches a user-facing card or summary.
 *
 * Kept dependency-free and pure so it can run in the browser bundle and inside
 * server-function handlers alike.
 */

/** Decode the most common HTML entities. Run repeatedly for double-encoding. */
function decodeEntitiesOnce(s: string): string {
  return s
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/&hellip;/gi, "...")
    .replace(/&mdash;/gi, "—")
    .replace(/&ndash;/gi, "–")
    .replace(/&#(\d+);/g, (_, d) => {
      try {
        return String.fromCodePoint(Number(d));
      } catch {
        return " ";
      }
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => {
      try {
        return String.fromCodePoint(parseInt(h, 16));
      } catch {
        return " ";
      }
    })
    .replace(/&amp;/gi, "&");
}

/**
 * Convert any HTML (or entity-encoded HTML, or a mix) into clean plain text.
 * Handles the common failure mode where feeds ship `&lt;p&gt;&lt;img&gt;` —
 * decoding and tag-stripping are interleaved across several passes so nothing
 * survives, and leftover URLs/bracketed fragments are removed too.
 */
export function htmlToPlainText(input: string | null | undefined): string {
  if (!input) return "";
  let s = String(input);

  // Drop whole dangerous / non-content blocks first.
  s = s.replace(/<(script|style|noscript|template)[\s\S]*?<\/\1>/gi, " ");
  s = s.replace(/<!--[\s\S]*?-->/g, " ");

  // Interleave decoding + tag-stripping to defeat entity-encoded markup.
  for (let i = 0; i < 3; i++) {
    s = decodeEntitiesOnce(s);
    s = s.replace(/<[^>]*>/g, " ");
  }

  // Strip any remaining (possibly unterminated) tag fragments and raw URLs.
  s = s.replace(/<\/?[a-z][^>]*>?/gi, " ");
  s = s.replace(/https?:\/\/\S+/gi, " ");
  s = s.replace(/\bwww\.\S+/gi, " ");
  s = s.replace(/\[[^\]]*\]/g, " ");

  return s.replace(/\s+/g, " ").trim();
}

/**
 * Build a clean, attractive summary of ~120–180 characters ending in "..."
 * when the source is longer. Always returns pure text.
 */
export function makeSummary(input: string | null | undefined, min = 120, max = 180): string {
  const text = htmlToPlainText(input);
  if (!text) return "";
  if (text.length <= max) return text;

  let slice = text.slice(0, max);
  const lastSpace = slice.lastIndexOf(" ");
  if (lastSpace > min) slice = slice.slice(0, lastSpace);
  return slice.replace(/[\s.,;:!?–—-]+$/, "") + "...";
}
