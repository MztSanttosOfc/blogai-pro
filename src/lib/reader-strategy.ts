/**
 * Environment-adaptive reading strategy for the Central de Recompensas and any
 * embedded-blog surface (e.g. Ferramentas Premium).
 *
 * Priority per surface:
 *  - Capacitor (Android now, iOS later): a NATIVE in-app WebView
 *    (@capacitor/inappbrowser) for a true native-app feel; falls back to
 *    @capacitor/browser (system Custom Tab / SFSafariViewController) when the
 *    native WebView plugin isn't available.
 *  - Web: "iframe" when the page allows embedding (best UX + real
 *    pageviews/AdSense), otherwise "popup" (new tab).
 *  - Third fallback everywhere: "reader" — an in-app sanitized reader view that
 *    preserves the main content, images and structure when the page cannot be
 *    embedded nor opened externally (X-Frame-Options / CSP / plugin missing).
 *
 * The strategy is resolved at runtime so the feature keeps working even if the
 * blog's embedding policy or the runtime platform changes in the future.
 */

export type ReaderStrategy = "native-browser" | "iframe" | "popup" | "reader";

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
}

function capacitor(): CapacitorGlobal | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
}

/** True when running inside the Capacitor native shell (Android or iOS). */
export function isCapacitorNative(): boolean {
  try {
    return !!capacitor()?.isNativePlatform?.();
  } catch {
    return false;
  }
}

/** Current native platform ("android" | "ios" | "web"). */
export function nativePlatform(): string {
  try {
    return capacitor()?.getPlatform?.() ?? "web";
  } catch {
    return "web";
  }
}

/**
 * Resolve the initial display strategy for a given embeddability probe result.
 * On the web the iframe is only chosen when the page is known to allow it;
 * otherwise we fall back to a popup so the feature never dead-ends.
 */
export function resolveStrategy(embeddable: boolean): ReaderStrategy {
  if (isCapacitorNative()) return "native-browser";
  return embeddable ? "iframe" : "popup";
}

/**
 * The next strategy to try when the current one fails. Guarantees the flow
 * always converges on the in-app "reader" fallback and never dead-ends.
 */
export function nextFallback(current: ReaderStrategy): ReaderStrategy {
  switch (current) {
    case "iframe":
      return isCapacitorNative() ? "native-browser" : "popup";
    case "native-browser":
    case "popup":
      return "reader";
    default:
      return "reader";
  }
}

export interface NativeBrowserSession {
  /** Wall-clock milliseconds the in-app browser/WebView stayed open. */
  waitClosed: Promise<number>;
  /** Force-close the in-app browser (e.g. when the user hits "Voltar"). */
  close: () => Promise<void>;
}

/**
 * Open the article in a native WebView. Prefers the true in-app WebView
 * (@capacitor/inappbrowser); falls back to @capacitor/browser (Custom Tab /
 * SFSafariViewController). Rejects if no native browser plugin is available so
 * the caller can fall back to the web/reader strategy.
 */
export async function openNativeBrowser(url: string): Promise<NativeBrowserSession> {
  const openedAt = Date.now();
  let resolveClosed!: (ms: number) => void;
  const waitClosed = new Promise<number>((r) => {
    resolveClosed = r;
  });

  // 1) Native in-app WebView (preferred).
  try {
    const mod = await import("@capacitor/inappbrowser").catch(() => null);
    const InAppBrowser = (mod as { InAppBrowser?: Record<string, unknown> } | null)?.InAppBrowser;
    if (InAppBrowser && typeof (InAppBrowser as { openInWebView?: unknown }).openInWebView === "function") {
      const iab = InAppBrowser as {
        openInWebView: (opts: unknown) => Promise<void>;
        addListener: (ev: string, cb: () => void) => Promise<{ remove: () => Promise<void> }>;
        close: () => Promise<void>;
      };
      const sub = await iab.addListener("browserClosed", () => {
        resolveClosed(Date.now() - openedAt);
        sub.remove().catch(() => {});
      });
      await iab.openInWebView({
        url,
        options: { showToolbar: true, showURL: false, presentationStyle: "fullscreen" },
      });
      return {
        waitClosed,
        close: async () => {
          try {
            await iab.close();
          } catch {
            /* already closed */
          }
        },
      };
    }
  } catch {
    /* fall through to @capacitor/browser */
  }

  // 2) System browser (Custom Tab / SFSafariViewController) fallback.
  const { Browser } = await import("@capacitor/browser");
  const finished = await Browser.addListener("browserFinished", () => {
    resolveClosed(Date.now() - openedAt);
    finished.remove().catch(() => {});
  });
  await Browser.open({ url, presentationStyle: "fullscreen" });
  return {
    waitClosed,
    close: async () => {
      try {
        await Browser.close();
      } catch {
        /* already closed */
      }
    },
  };
}

/** Open the article in a new browser tab (web fallback). Returns null if blocked. */
export function openPopup(url: string): Window | null {
  if (typeof window === "undefined") return null;
  return window.open(url, "_blank", "noopener,noreferrer");
}
