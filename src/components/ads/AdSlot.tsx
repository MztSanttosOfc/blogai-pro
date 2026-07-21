import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export const ADSENSE_CLIENT = "ca-pub-7734451387580533";

export type AdFormat = "auto" | "fluid" | "rectangle" | "horizontal" | "vertical";
export type AdKind = "banner" | "display" | "in-feed" | "multiplex";

interface AdSlotProps {
  /** AdSense ad slot id (data-ad-slot). Leave empty until you create the unit in AdSense. */
  slot?: string;
  kind?: AdKind;
  format?: AdFormat;
  layout?: string;
  layoutKey?: string;
  responsive?: boolean;
  className?: string;
  style?: React.CSSProperties;
  /** Force render even for paid plans (rarely useful). */
  force?: boolean;
}

/**
 * Reusable Google AdSense slot.
 *
 * - Paid plans (pro / premium) never render ads.
 * - When no `slot` id is provided, renders nothing (safe to place ahead of AdSense unit creation).
 * - Loads adsbygoogle push on mount; the global script is injected once in __root.tsx.
 */
export function AdSlot({
  slot,
  kind = "display",
  format = "auto",
  layout,
  layoutKey,
  responsive = true,
  className,
  style,
  force = false,
}: AdSlotProps) {
  const { profile } = useAuth();
  const ref = useRef<HTMLModElement | null>(null);
  const pushed = useRef(false);

  const isPaid = profile?.plan === "pro" || profile?.plan === "premium";
  const shouldRender = !!slot && (force || !isPaid);

  useEffect(() => {
    if (!shouldRender || pushed.current) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any;
      w.adsbygoogle = w.adsbygoogle || [];
      w.adsbygoogle.push({});
      pushed.current = true;
    } catch {
      /* ignore adsbygoogle errors */
    }
  }, [shouldRender]);

  if (!shouldRender) return null;

  return (
    <ins
      ref={ref}
      className={cn("adsbygoogle block", className)}
      style={{ display: "block", ...style }}
      data-ad-client={ADSENSE_CLIENT}
      data-ad-slot={slot}
      data-ad-format={format}
      data-ad-layout={layout}
      data-ad-layout-key={layoutKey}
      data-full-width-responsive={responsive ? "true" : "false"}
      data-kind={kind}
    />
  );
}

export default AdSlot;
