import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Crown, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

/**
 * Restricts its children to Premium plan users. Non-premium users see an
 * upgrade prompt instead. This is a UX gate; server functions independently
 * re-check the plan before performing premium actions.
 */
export function PremiumGate({
  children,
  title = "Recurso Premium",
  description = "Este recurso está disponível no plano Premium.",
}: {
  children: ReactNode;
  title?: string;
  description?: string;
}) {
  const { profile, loading } = useAuth();

  if (loading) return null;

  if (profile?.plan !== "premium") {
    return (
      <div className="mx-auto max-w-2xl py-10">
        <Card className="flex flex-col items-center gap-4 p-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Lock className="h-7 w-7" />
          </div>
          <h2 className="font-display text-2xl font-bold">{title}</h2>
          <p className="max-w-md text-muted-foreground">{description}</p>
          <Button asChild variant="hero" size="lg">
            <Link to="/pricing">
              <Crown className="h-4 w-4" /> Fazer upgrade para Premium
            </Link>
          </Button>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
