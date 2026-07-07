import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, BookOpen, ExternalLink, Loader2, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  resolveStrategy,
  nextFallback,
  isCapacitorNative,
  openNativeBrowser,
  openPopup,
  type ReaderStrategy,
  type NativeBrowserSession,
} from "@/lib/reader-strategy";
import {
  getPremiumPageEmbed,
  getPremiumPageReader,
  type PremiumReaderContent,
} from "@/lib/premium-tools.functions";
import type { PremiumPage } from "@/lib/premium-tools";

/**
 * Full-screen embedded viewer for a live blog page. Uses the same adaptive
 * strategy as the Central de Recompensas:
 *   web → iframe (if embeddable) → popup → reader mode
 *   Capacitor → native WebView → reader mode
 * The page is always loaded live (never duplicated), so blog updates appear
 * automatically. Works identically on Android now and iOS in the future.
 */
export function EmbeddedBlogView({ page, onClose }: { page: PremiumPage; onClose: () => void }) {
  const fetchEmbed = useServerFn(getPremiumPageEmbed);
  const fetchReader = useServerFn(getPremiumPageReader);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const nativeSession = useRef<NativeBrowserSession | null>(null);

  const [strategy, setStrategy] = useState<ReaderStrategy | null>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [reader, setReader] = useState<PremiumReaderContent | null>(null);
  const [readerLoading, setReaderLoading] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Resolve the best strategy for this environment / page.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (isCapacitorNative()) {
        if (!cancelled) setStrategy("native-browser");
        return;
      }
      try {
        const res = await fetchEmbed({ data: { slug: page.slug } });
        if (!cancelled) setStrategy(resolveStrategy(res.embeddable));
      } catch {
        if (!cancelled) setStrategy("iframe");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchEmbed, page.slug]);

  // Native WebView (Capacitor).
  useEffect(() => {
    if (strategy !== "native-browser") return;
    let done = false;
    (async () => {
      try {
        nativeSession.current = await openNativeBrowser(page.url);
      } catch {
        if (!done) setStrategy(nextFallback("native-browser"));
      }
    })();
    return () => {
      done = true;
      nativeSession.current?.close();
      nativeSession.current = null;
    };
  }, [strategy, page.url]);

  // Popup fallback.
  useEffect(() => {
    if (strategy !== "popup") return;
    const win = openPopup(page.url);
    if (!win) setStrategy("reader");
  }, [strategy, page.url]);

  // Iframe safety net.
  useEffect(() => {
    if (strategy !== "iframe") return;
    const t = setTimeout(() => {
      if (!iframeLoaded) setStrategy(nextFallback("iframe"));
    }, 8000);
    return () => clearTimeout(t);
  }, [strategy, iframeLoaded]);

  // Reader Mode fallback content.
  useEffect(() => {
    if (strategy !== "reader" || reader || readerLoading) return;
    let cancelled = false;
    setReaderLoading(true);
    (async () => {
      try {
        const res = await fetchReader({ data: { slug: page.slug } });
        if (!cancelled) setReader(res);
      } catch {
        if (!cancelled) toast.error("Não foi possível carregar o modo leitor.");
      } finally {
        if (!cancelled) setReaderLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [strategy, reader, readerLoading, fetchReader, page.slug]);

  const handleClose = useCallback(() => {
    nativeSession.current?.close();
    onClose();
  }, [onClose]);

  const label =
    strategy === "native-browser"
      ? "Leitor nativo"
      : strategy === "popup"
        ? "Aba do navegador"
        : strategy === "reader"
          ? "Modo leitor"
          : "No app";

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-background">
      <header className="flex shrink-0 items-center gap-2 border-b px-3 py-2 sm:px-4">
        <Button variant="ghost" size="sm" onClick={handleClose} className="shrink-0 px-2">
          <ArrowLeft className="h-4 w-4 sm:mr-1" />
          <span className="hidden sm:inline">Voltar</span>
        </Button>
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold sm:text-base">{page.title}</h2>
        <Badge variant="outline" className="hidden shrink-0 gap-1 sm:inline-flex">
          {strategy === "native-browser" ? <Smartphone className="h-3 w-3" /> : <BookOpen className="h-3 w-3" />}
          {label}
        </Badge>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        {!strategy ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Abrindo ferramenta...
          </div>
        ) : strategy === "iframe" ? (
          <iframe
            ref={iframeRef}
            src={page.url}
            title={page.title}
            loading="lazy"
            onLoad={() => setIframeLoaded(true)}
            referrerPolicy="no-referrer-when-downgrade"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            className="h-full min-h-[80vh] w-full max-w-full border-0 bg-white"
          />
        ) : strategy === "reader" ? (
          <div className="mx-auto w-full max-w-2xl px-4 py-5 sm:px-6">
            {readerLoading || !reader ? (
              <div className="flex items-center justify-center py-20 text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando modo leitor...
              </div>
            ) : (
              <article className="prose-reader">
                <h1 className="mb-4 text-xl font-bold leading-snug sm:text-2xl">{reader.title}</h1>
                <div dangerouslySetInnerHTML={{ __html: reader.html }} />
              </article>
            )}
          </div>
        ) : (
          <div className="mx-auto max-w-md p-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              {strategy === "native-browser" ? <Smartphone className="h-7 w-7" /> : <ExternalLink className="h-7 w-7" />}
            </div>
            <h3 className="text-lg font-semibold">
              {strategy === "native-browser" ? "Aberto no leitor nativo" : "Aberto em nova aba"}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              A ferramenta foi aberta preservando o layout e as funcionalidades originais do blog.
            </p>
            <Button
              className="mt-5 w-full max-w-full"
              variant="outline"
              onClick={() =>
                strategy === "native-browser"
                  ? openNativeBrowser(page.url).then((s) => (nativeSession.current = s))
                  : openPopup(page.url)
              }
            >
              <ExternalLink className="mr-2 h-4 w-4" /> Reabrir
            </Button>
            <Button className="mt-2 w-full max-w-full" variant="ghost" onClick={() => setStrategy("reader")}>
              <BookOpen className="mr-2 h-4 w-4" /> Ver no modo leitor
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
