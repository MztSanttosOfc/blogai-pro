import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Coins,
  CheckCircle2,
  XCircle,
  Lock,
  Loader2,
  Plus,
  Save,
  Trash2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import {
  monetizationGet,
  monetizationUpdateSettings,
  monetizationUpsertSlot,
  monetizationDeleteSlot,
  type AdSlotRow,
  type MonetizationSettings,
} from "@/lib/monetization-admin.functions";

export const Route = createFileRoute("/_authenticated/admin/monetizacao")({
  head: () => ({
    meta: [
      { title: "Central de Monetização — BlogAI Pro" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: MonetizationCenter,
});

function MonetizationCenter() {
  const { role, loading } = useAuth();
  const isOwner = role === "owner";

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="mx-auto max-w-md py-16">
        <Card className="flex flex-col items-center gap-4 p-10 text-center">
          <Lock className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-semibold">Acesso restrito</h1>
          <p className="text-sm text-muted-foreground">
            Esta área é exclusiva para o Owner do BlogAI Pro.
          </p>
        </Card>
      </div>
    );
  }

  return <MonetizationDashboard />;
}

function MonetizationDashboard() {
  const qc = useQueryClient();
  const getFn = useServerFn(monetizationGet);
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["monetization", "admin"],
    queryFn: () => getFn(),
  });

  if (isLoading || !data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const { settings, slots } = data;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 p-3">
            <Coins className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Central de Monetização</h1>
            <p className="text-sm text-muted-foreground">
              Área exclusiva do Owner. Configure Google AdSense, slots e políticas de exibição.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
          Recarregar
        </Button>
      </header>

      <Tabs defaultValue="adsense" className="space-y-4">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="adsense">AdSense</TabsTrigger>
          <TabsTrigger value="slots">Slots ({slots.length})</TabsTrigger>
          <TabsTrigger value="controls">Controles</TabsTrigger>
          <TabsTrigger value="stats">Estatísticas</TabsTrigger>
          <TabsTrigger value="gateways">Gateways</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="adsense">
          <AdSenseTab settings={settings} />
        </TabsContent>
        <TabsContent value="slots">
          <SlotsTab
            slots={slots}
            onChanged={() => qc.invalidateQueries({ queryKey: ["monetization", "admin"] })}
          />
        </TabsContent>
        <TabsContent value="controls">
          <ControlsTab
            settings={settings}
            onSaved={() => qc.invalidateQueries({ queryKey: ["monetization", "admin"] })}
          />
        </TabsContent>
        <TabsContent value="stats">
          <StatsSoon />
        </TabsContent>
        <TabsContent value="gateways">
          <GatewaysSoon />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsTab
            settings={settings}
            onSaved={() => qc.invalidateQueries({ queryKey: ["monetization", "admin"] })}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <span className="text-sm">{label}</span>
      {ok ? (
        <Badge className="gap-1 bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20">
          <CheckCircle2 className="h-3.5 w-3.5" /> Instalado
        </Badge>
      ) : (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3.5 w-3.5" /> Ausente
        </Badge>
      )}
    </div>
  );
}

function AdSenseTab({ settings }: { settings: MonetizationSettings }) {
  const [check, setCheck] = useState<{ meta: boolean; script: boolean; adstxt: boolean | null }>({
    meta: false,
    script: false,
    adstxt: null,
  });

  async function verify() {
    if (typeof document === "undefined") return;
    const meta = !!document.querySelector('meta[name="google-adsense-account"]');
    const script = !!document.querySelector('script[src*="pagead2.googlesyndication.com"]');
    let adstxt: boolean | null = null;
    try {
      const res = await fetch("/ads.txt");
      const text = await res.text();
      adstxt = res.ok && text.includes(settings.publisher_id.replace("ca-", ""));
    } catch {
      adstxt = false;
    }
    setCheck({ meta, script, adstxt });
    toast.success("Verificação concluída.");
  }

  useEffect(() => {
    verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="p-5">
        <h2 className="mb-3 text-lg font-semibold">Status da integração</h2>
        <div className="space-y-2">
          <StatusRow label="Meta tag google-adsense-account" ok={check.meta} />
          <StatusRow label="Script adsbygoogle.js" ok={check.script} />
          <StatusRow label="ads.txt público" ok={!!check.adstxt} />
        </div>
        <Button className="mt-4 w-full" onClick={verify}>
          <RefreshCw className="mr-2 h-4 w-4" /> Verificar instalação
        </Button>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 text-lg font-semibold">Publisher</h2>
        <div className="space-y-2 text-sm">
          <div>
            <p className="text-muted-foreground">Publisher ID</p>
            <p className="font-mono text-sm">{settings.publisher_id}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Anúncios habilitados globalmente</p>
            <p className="font-medium">{settings.ads_enabled ? "Sim" : "Não"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Exibir apenas para plano Free</p>
            <p className="font-medium">{settings.free_only ? "Sim" : "Não"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Páginas desativadas</p>
            <p className="font-medium">{settings.disabled_pages.length}</p>
          </div>
        </div>
      </Card>

      <Card className="p-5 md:col-span-2">
        <h2 className="mb-3 text-lg font-semibold">Checklist</h2>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            Domínio adicionado no painel do Google AdSense
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            Meta tag e script instalados no <code>&lt;head&gt;</code>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            Arquivo <code>/ads.txt</code> acessível publicamente
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            Slots cadastrados na aba "Slots" com <code>data-ad-slot</code>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            Ativar exibição global na aba "Controles"
          </li>
        </ul>
      </Card>
    </div>
  );
}

function ControlsTab({
  settings,
  onSaved,
}: {
  settings: MonetizationSettings;
  onSaved: () => void;
}) {
  const [adsEnabled, setAdsEnabled] = useState(settings.ads_enabled);
  const [freeOnly, setFreeOnly] = useState(settings.free_only);
  const [disabled, setDisabled] = useState(settings.disabled_pages.join(", "));
  const [saving, setSaving] = useState(false);
  const updateFn = useServerFn(monetizationUpdateSettings);

  async function save() {
    setSaving(true);
    try {
      await updateFn({
        data: {
          ads_enabled: adsEnabled,
          free_only: freeOnly,
          disabled_pages: disabled
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        },
      });
      toast.success("Configurações salvas.");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="space-y-5 p-6">
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <p className="font-medium">Exibir anúncios globalmente</p>
          <p className="text-xs text-muted-foreground">
            Chave mestra: quando desligada, nenhum slot é renderizado.
          </p>
        </div>
        <Switch checked={adsEnabled} onCheckedChange={setAdsEnabled} />
      </div>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <p className="font-medium">Apenas para usuários Free</p>
          <p className="text-xs text-muted-foreground">
            Pro e Premium nunca verão anúncios enquanto essa opção estiver ativa.
          </p>
        </div>
        <Switch checked={freeOnly} onCheckedChange={setFreeOnly} />
      </div>

      <div className="space-y-2">
        <Label>Páginas desativadas (separadas por vírgula)</Label>
        <Textarea
          value={disabled}
          onChange={(e) => setDisabled(e.target.value)}
          placeholder="/checkout, /pricing, /admin"
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          Rotas listadas aqui nunca exibirão anúncios, mesmo que os slots estejam ativos.
        </p>
      </div>

      <Button onClick={save} disabled={saving}>
        <Save className="mr-2 h-4 w-4" />
        {saving ? "Salvando…" : "Salvar controles"}
      </Button>
    </Card>
  );
}

function SlotsTab({ slots, onChanged }: { slots: AdSlotRow[]; onChanged: () => void }) {
  const [editing, setEditing] = useState<AdSlotRow | null>(null);
  const [open, setOpen] = useState(false);
  const deleteFn = useServerFn(monetizationDeleteSlot);

  function openNew() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(s: AdSlotRow) {
    setEditing(s);
    setOpen(true);
  }

  async function remove(id: string) {
    if (!confirm("Remover este slot?")) return;
    try {
      await deleteFn({ data: { id } });
      toast.success("Slot removido.");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao remover.");
    }
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Slots de anúncio</h2>
          <p className="text-sm text-muted-foreground">
            Cadastre os IDs (<code>data-ad-slot</code>) criados no painel do AdSense.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" /> Novo slot
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Posição</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Formato</TableHead>
              <TableHead>Slot code</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slots.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>{s.position}</TableCell>
                <TableCell>{s.kind}</TableCell>
                <TableCell>{s.format}</TableCell>
                <TableCell className="font-mono text-xs">{s.slot_code ?? "—"}</TableCell>
                <TableCell>
                  {s.active ? (
                    <Badge className="bg-emerald-500/15 text-emerald-600">Ativo</Badge>
                  ) : (
                    <Badge variant="outline">Inativo</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(s)}>
                    Editar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(s.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {slots.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Nenhum slot cadastrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <SlotDialog
        open={open}
        onOpenChange={setOpen}
        initial={editing}
        onSaved={() => {
          setOpen(false);
          onChanged();
        }}
      />
    </Card>
  );
}

function SlotDialog({
  open,
  onOpenChange,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: AdSlotRow | null;
  onSaved: () => void;
}) {
  const upsertFn = useServerFn(monetizationUpsertSlot);
  const [form, setForm] = useState({
    name: "",
    position: "",
    slot_code: "",
    kind: "display",
    format: "auto",
    active: false,
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        name: initial?.name ?? "",
        position: initial?.position ?? "",
        slot_code: initial?.slot_code ?? "",
        kind: initial?.kind ?? "display",
        format: initial?.format ?? "auto",
        active: initial?.active ?? false,
        notes: initial?.notes ?? "",
      });
    }
  }, [open, initial]);

  async function submit() {
    setSaving(true);
    try {
      await upsertFn({
        data: {
          id: initial?.id,
          name: form.name,
          position: form.position,
          slot_code: form.slot_code.trim() || null,
          kind: form.kind,
          format: form.format,
          active: form.active,
          notes: form.notes.trim() || null,
        },
      });
      toast.success(initial ? "Slot atualizado." : "Slot criado.");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar slot" : "Novo slot"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Posição</Label>
              <Input
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
                placeholder="top, sidebar, in-feed…"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>data-ad-slot</Label>
            <Input
              value={form.slot_code}
              onChange={(e) => setForm({ ...form, slot_code: e.target.value })}
              placeholder="Ex.: 1234567890"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Input value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Formato</Label>
              <Input value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Observações</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label>Ativo</Label>
            <Switch
              checked={form.active}
              onCheckedChange={(v) => setForm({ ...form, active: v })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving || !form.name || !form.position}>
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatsSoon() {
  const cards = useMemo(
    () => ["Impressões", "Cliques", "CTR", "Receita estimada", "RPM", "CPC"],
    [],
  );
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((label) => (
        <Card key={label} className="p-5">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-bold text-muted-foreground/70">Em breve</p>
          <p className="text-xs text-muted-foreground">
            Requer integração oficial com AdSense Management API.
          </p>
        </Card>
      ))}
    </div>
  );
}

function GatewaysSoon() {
  const items = [
    { name: "Google Ad Manager", desc: "Gerenciamento avançado de inventário" },
    { name: "Ezoic / Mediavine", desc: "Redes alternativas de alta receita" },
    { name: "Publicidade direta", desc: "Venda direta com fill de banners próprios" },
  ];
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {items.map((i) => (
        <Card key={i.name} className="p-5">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">{i.name}</h3>
          </div>
          <p className="text-sm text-muted-foreground">{i.desc}</p>
          <Badge variant="outline" className="mt-3">
            Em breve
          </Badge>
        </Card>
      ))}
    </div>
  );
}

function SettingsTab({
  settings,
  onSaved,
}: {
  settings: MonetizationSettings;
  onSaved: () => void;
}) {
  const updateFn = useServerFn(monetizationUpdateSettings);
  const [publisher, setPublisher] = useState(settings.publisher_id);
  const [metaTag, setMetaTag] = useState(settings.meta_tag);
  const [script, setScript] = useState(settings.script_snippet);
  const [adsTxt, setAdsTxt] = useState(settings.ads_txt);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await updateFn({
        data: {
          publisher_id: publisher.trim(),
          meta_tag: metaTag,
          script_snippet: script,
          ads_txt: adsTxt,
        },
      });
      toast.success("Configurações salvas.");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="space-y-4 p-6">
      <div className="space-y-1">
        <Label>Publisher ID</Label>
        <Input value={publisher} onChange={(e) => setPublisher(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label>Meta Tag</Label>
        <Textarea value={metaTag} onChange={(e) => setMetaTag(e.target.value)} rows={2} />
      </div>
      <div className="space-y-1">
        <Label>Script</Label>
        <Textarea value={script} onChange={(e) => setScript(e.target.value)} rows={3} />
      </div>
      <div className="space-y-1">
        <Label>ads.txt</Label>
        <Textarea value={adsTxt} onChange={(e) => setAdsTxt(e.target.value)} rows={2} />
        <p className="text-xs text-muted-foreground">
          Estes valores ficam registrados para referência. A instalação real vive em{" "}
          <code>src/routes/__root.tsx</code> e <code>public/ads.txt</code>.
        </p>
      </div>
      <Button onClick={save} disabled={saving}>
        <Save className="mr-2 h-4 w-4" />
        {saving ? "Salvando…" : "Salvar configurações"}
      </Button>
    </Card>
  );
}
