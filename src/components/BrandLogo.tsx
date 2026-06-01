import { PenLine } from "lucide-react";
import { cn } from "@/lib/utils";

export function BrandLogo({
  className,
  withText = true,
  invert = false,
}: {
  className?: string;
  withText?: boolean;
  invert?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
        <PenLine className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
      </div>
      {withText && (
        <span
          className={cn(
            "font-display text-lg font-bold tracking-tight",
            invert ? "text-sidebar-foreground" : "text-foreground",
          )}
        >
          BlogAI<span className="text-gradient"> Pro</span>
        </span>
      )}
    </div>
  );
}
