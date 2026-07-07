/**
 * Environment-adaptive reading strategy for the Central de Recompensas.
 *
 * The reader must work across three surfaces without breaking:
 *  - "native-browser": Capacitor Android → open the article in a native
 *    in-app WebView (Chrome Custom Tab) for a native-app feel + performance.
 *  - "iframe": regular browsers where the blog allows embedding → keep the
 *    original page visible inside the app (best UX, real pageviews/AdSense).
 *  - "popup": browsers where embedding is blocked (X-Frame-Options / CSP
 *    frame-ancestors / future Blogger or browser changes) → open the original
 *    page in a new tab and validate reading by time + window focus.
 *
 * The strategy is resolved at runtime so the feature keeps working even if the
 * blog's embedding policy changes in the future.
 */

export type ReaderStrategy = "native-browser" | "iframe" | "popup";

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
}

/** True when running inside the Capacitor Android/iOS native shell. */
export function isCapacitorNative(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
  try {
    return !!cap?.isNativePlatform?.();
  } catch {
    return false;
  }
}

/**
 * Resolve the initial display strategy for a given embeddability probe result.
 * On the web the iframe is only chosen when the blog is known to allow it;
 * otherwise we fall back to a popup so the feature never dead-ends.
 */
export function resolveStrategy(embeddable: boolean): ReaderStrategy {
  if (isCapacitorNative()) return "native-browser";
  return embeddable ? "iframe" : "popup";
}

export interface NativeBrowserSession {
  /** Wall-clock milliseconds the in-app browser stayed open. */
  waitClosed: Promise<number>;
  /** Force-close the in-app browser (e.g. when the user hits "Voltar"). */
  close: () => Promise<void>;
}

/**
 * Open the article in the Capacitor in-app browser (native WebView screen) and
 * resolve with the reading duration once the user closes it.
 */
export async function openNativeBrowser(url: string): Promise<NativeBrowserSession> {
  const { Browser } = await import("@capacitor/browser");
  const openedAt = Date.now();

  let resolveClosed!: (ms: number) => void;
  const waitClosed = new Promise<number>((r) => {
    resolveClosed = r;
  });

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

/** Open the article in a new browser tab (web fallback strategy). */
export function openPopup(url: string): Window | null {
  if (typeof window === "undefined") return null;
  return window.open(url, "_blank", "noopener,noreferrer");
}
