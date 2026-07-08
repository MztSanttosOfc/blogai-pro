import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Shield, Users, BarChart3, ScrollText, Search, Loader2, Lock, Coins } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import {
  adminListUsers,
  adminGetStats,
  adminSetPlan,
  adminAdjustCredits,
  adminListAuditLogs,
  type AdminUserRow,
} from "@/lib/admin.functions";
import { type PlanId } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Administração — BlogAI Pro" }] }),
  component: AdminPage,
});

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function AdminPage() {
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md py-16">
        <Card className="flex flex-col items-center gap-4 p-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <Lock className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold">Acesso restrito</h2>
          <p className="text-muted-foreground">Esta área é exclusiva para administradores.</p>
        </Card>
      </div>
    );
  }

  return <AdminDashboard />;
}

function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Painel Administrativo</h1>
          <p className="text-sm text-muted-foreground">Gestão completa do BlogAI Pro</p>
        </div>
      </div>

      <Tabs defaultValue="stats">
        <TabsList>
          <TabsTrigger value="stats" className="gap-2">
            <BarChart3 className="h-4 w-4" /> Estatísticas
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" /> Usuários
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <ScrollText className="h-4 w-4" /> Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stats" className="mt-6">
          <StatsTab />
        </TabsContent>
        <TabsContent value="users" className="mt-6">
          <UsersTab />
        </TabsContent>
        <TabsContent value="logs" className="mt-6">
          <LogsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCardSimple({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </Card>
  );
}

function StatsTab() {
  const fetchStats = useServerFn(adminGetStats);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => fetchStats(),
  });

  if (isLoading) {
    return <Loader2 className="h-6 w-6 animate-spin text-primary" />;
  }
  const s = data?.stats;
  if (!s) return <p className="text-muted-foreground">Sem dados.</p>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCardSimple label="Total de usuários" value={s.total_users} />
        <StatCardSimple label="Gratuitos" value={s.free_users} />
        <StatCardSimple label="Pro" value={s.pro_users} />
        <StatCardSimple label="Premium" value={s.premium_users} />
        <StatCardSimple label="Pagamentos confirmados" value={s.total_payments} />
        <StatCardSimple label="Receita total" value={formatBRL(s.total_revenue_cents)} />
        <StatCardSimple label="Créditos distribuídos" value={s.credits_distributed} />
        <StatCardSimple label="Créditos consumidos" value={s.credits_consumed} />
        <StatCardSimple label="Novos (7 dias)" value={s.new_users_7d} />
        <StatCardSimple label="Novos (30 dias)" value={s.new_users_30d} />
        <StatCardSimple label="Artigos gerados" value={s.total_articles} />
        <StatCardSimple label="Contas de teste" value={s.teste_users} />
      </div>
    </div>
  );
}

function UsersTab() {
  const queryClient = useQueryClient();
  const fetchUsers = useServerFn(adminListUsers);
  const setPlan = useServerFn(adminSetPlan);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [creditUser, setCreditUser] = useState<AdminUserRow | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => fetchUsers(),
  });

  const users = useMemo(() => {
    let list = data?.users ?? [];
    if (planFilter !== "all") list = list.filter((u) => u.plan === planFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (u) =>
          (u.email ?? "").toLowerCase().includes(q) ||
          (u.full_name ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [data, planFilter, search]);

  const handleSetPlan = async (userId: string, plan: PlanId) => {
    try {
      await setPlan({ data: { userId, plan } });
      toast.success("Plano atualizado.");
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao alterar plano.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os planos</SelectItem>
            <SelectItem value="free">Gratuito</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
            <SelectItem value="premium">Premium</SelectItem>
            <SelectItem value="teste">Teste</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Créditos</TableHead>
                <TableHead>Assinatura</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead>Último acesso</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="font-medium">{u.full_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                    {u.role && (
                      <Badge variant="secondary" className="mt-1 text-[10px] uppercase">
                        {u.role}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select value={u.plan} onValueChange={(v) => handleSetPlan(u.id, v as PlanId)}>
                      <SelectTrigger className="h-8 w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Gratuito</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                        <SelectItem value="teste">Teste</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>{u.credits >= 999999 ? "∞" : u.credits}</TableCell>
                  <TableCell>
                    <Badge variant={u.subscription_status === "active" ? "default" : "outline"}>
                      {u.subscription_status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{formatDate(u.created_at)}</TableCell>
                  <TableCell className="text-xs">{formatDate(u.last_sign_in_at)}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => setCreditUser(u)}>
                      <Coins className="h-3.5 w-3.5" /> Créditos
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    Nenhum usuário encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <CreditsDialog
        user={creditUser}
        onClose={() => setCreditUser(null)}
        onDone={() => queryClient.invalidateQueries({ queryKey: ["admin"] })}
      />
    </div>
  );
}

function CreditsDialog({
  user,
  onClose,
  onDone,
}: {
  user: AdminUserRow | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const adjust = useServerFn(adminAdjustCredits);
  const [mode, setMode] = useState<"add" | "remove" | "set">("add");
  const [amount, setAmount] = useState("10");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!user) return;
    const n = Number(amount);
    if (!Number.isFinite(n) || n < 0) {
      toast.error("Informe uma quantidade válida.");
      return;
    }
    setSaving(true);
    try {
      await adjust({
        data: { userId: user.id, mode, amount: n, reason: reason.trim() || undefined },
      });
      toast.success("Créditos atualizados.");
      onDone();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao ajustar créditos.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={user !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gerenciar créditos</DialogTitle>
        </DialogHeader>
        {user && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {user.full_name ?? user.email} — saldo atual:{" "}
              <strong>{user.credits >= 999999 ? "ilimitado" : user.credits}</strong>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Operação</Label>
                <Select value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add">Adicionar</SelectItem>
                    <SelectItem value="remove">Remover</SelectItem>
                    <SelectItem value="set">Definir</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  min={0}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Motivo (opcional)</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LogsTab() {
  const fetchLogs = useServerFn(adminListAuditLogs);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "logs"],
    queryFn: () => fetchLogs(),
  });

  if (isLoading) return <Loader2 className="h-6 w-6 animate-spin text-primary" />;
  const logs = data?.logs ?? [];

  return (
    <div className="overflow-x-auto rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Ação</TableHead>
            <TableHead>Administrador</TableHead>
            <TableHead>Usuário alvo</TableHead>
            <TableHead>Detalhes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((l) => (
            <TableRow key={l.id}>
              <TableCell className="whitespace-nowrap text-xs">
                {formatDate(l.created_at)}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{l.action}</Badge>
              </TableCell>
              <TableCell className="text-xs">{l.admin_email ?? "—"}</TableCell>
              <TableCell className="text-xs">{l.target_email ?? "—"}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{l.details ?? "—"}</TableCell>
            </TableRow>
          ))}
          {logs.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                Nenhum registro ainda.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
