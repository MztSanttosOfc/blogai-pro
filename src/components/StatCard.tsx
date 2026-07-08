import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  accent?: "primary" | "success" | "warning" | "chart";
}

const accentMap = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/15 text-warning",
  chart: "bg-chart-3/10 text-chart-3",
};

export function StatCard({ label, value, icon: Icon, hint, accent = "primary" }: StatCardProps) {
  return (
    <Card className="flex flex-col gap-3 p-5 shadow-soft transition-shadow hover:shadow-elegant">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <div
          className={cn("flex h-9 w-9 items-center justify-center rounded-lg", accentMap[accent])}
        >
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>
      <div className="font-display text-3xl font-bold text-foreground">{value}</div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}
