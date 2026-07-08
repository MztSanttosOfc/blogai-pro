import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Coins, CreditCard, Receipt, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getFinancialOverview } from "@/lib/payments.functions";
import { PLAN_LABELS, type PlanId } from "@/lib/constants";

const financialQueryOptions = queryOptions({
  queryKey: ["financial-overview"],
  queryFn: () => getFinancialOverview(),
});

export const Route = createFileRoute("/_authenticated/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro — BlogAI Pro" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(financialQueryOptions),
  component: FinancialPage,
  errorComponent: ({ error }) => (
    <div
      role="alert"
      className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm"
    >
      Não foi possível carregar os dados financeiros: {error.message}
    </div>
  ),
});

const BRL = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

const PAYMENT_STATUS: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" }
> = {
  paid: { label: "Pago", variant: "default" },
  pending: { label: "Pendente", variant: "secondary" },
  failed: { label: "Falhou", variant: "destructive" },
  refunded: { label: "Reembolsado", variant: "secondary" },
  canceled: { label: "Cancelado", variant: "secondary" },
};

function FinancialPage() {
  const { data } = useSuspenseQuery(financialQueryOptions);
  const { subscription, payments, credits } = data;

  const totalPaid = payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount_cents, 0);

  const planLabel = PLAN_LABELS[(subscription?.plan_id as PlanId) ?? "free"];

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold md:text-3xl">Financeiro</h1>
        <p className="text-muted-foreground">
          Acompanhe sua assinatura, pagamentos e movimentação de créditos.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Wallet className="h-4 w-4" />
            <span className="text-sm">Plano atual</span>
          </div>
          <p className="mt-2 text-2xl font-bold">{planLabel}</p>
          {subscription?.current_period_end && subscription.plan_id !== "free" && (
            <p className="mt-1 text-xs text-muted-foreground">
              Renova em {fmtDate(subscription.current_period_end)}
            </p>
          )}
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CreditCard className="h-4 w-4" />
            <span className="text-sm">Total investido</span>
          </div>
          <p className="mt-2 text-2xl font-bold">{BRL(totalPaid)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{payments.length} transação(ões)</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Coins className="h-4 w-4" />
            <span className="text-sm">Movimentações de crédito</span>
          </div>
          <p className="mt-2 text-2xl font-bold">{credits.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">registros recentes</p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 border-b p-4">
          <Receipt className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Histórico de pagamentos</h2>
        </div>
        {payments.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">Nenhum pagamento registrado ainda.</p>
        ) : (
          <div className="divide-y">
            {payments.map((p) => {
              const st = PAYMENT_STATUS[p.status] ?? {
                label: p.status,
                variant: "secondary" as const,
              };
              return (
                <div key={p.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <p className="font-medium">
                      Plano {PLAN_LABELS[(p.plan_id as PlanId) ?? "free"]}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {fmtDate(p.created_at)} · {p.method.toUpperCase()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{BRL(p.amount_cents)}</span>
                    <Badge variant={st.variant}>{st.label}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 border-b p-4">
          <Coins className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Extrato de créditos</h2>
        </div>
        {credits.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            Nenhuma movimentação de crédito ainda.
          </p>
        ) : (
          <div className="divide-y">
            {credits.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="truncate font-medium">{c.description}</p>
                  <p className="text-xs text-muted-foreground">{fmtDate(c.created_at)}</p>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <span
                    className={
                      c.amount >= 0
                        ? "font-semibold text-success"
                        : "font-semibold text-destructive"
                    }
                  >
                    {c.amount >= 0 ? "+" : ""}
                    {c.amount}
                  </span>
                  {c.balance_after != null && (
                    <span className="text-xs text-muted-foreground">saldo {c.balance_after}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
