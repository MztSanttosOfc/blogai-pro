import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface MonetizationSettings {
  id: boolean;
  ads_enabled: boolean;
  free_only: boolean;
  publisher_id: string;
  meta_tag: string;
  script_snippet: string;
  ads_txt: string;
  disabled_pages: string[];
  updated_at: string;
}

export interface AdSlotRow {
  id: string;
  name: string;
  position: string;
  slot_code: string | null;
  kind: string;
  format: string;
  active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

async function assertOwner(supabase: AnyClient, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "owner",
  });
  if (error || data !== true) throw new Error("forbidden");
}

async function audit(
  supabase: AnyClient,
  adminId: string,
  action: string,
  oldValue: unknown,
  newValue: unknown,
  details: string,
) {
  const { data: p } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", adminId)
    .maybeSingle();
  await supabase.from("admin_audit_logs").insert({
    action,
    admin_id: adminId,
    admin_email: (p as { email?: string } | null)?.email ?? null,
    old_value: oldValue ?? null,
    new_value: newValue ?? null,
    details,
  });
}

export const monetizationGet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertOwner(supabase, userId);
    const [settingsRes, slotsRes] = await Promise.all([
      supabase.from("monetization_settings").select("*").eq("id", true).maybeSingle(),
      supabase.from("ad_slots").select("*").order("name", { ascending: true }),
    ]);
    if (settingsRes.error) throw new Error("Não foi possível carregar as configurações.");
    if (slotsRes.error) throw new Error("Não foi possível carregar os slots.");
    return {
      settings: settingsRes.data as MonetizationSettings,
      slots: (slotsRes.data ?? []) as AdSlotRow[],
    };
  });

const SettingsInput = z.object({
  ads_enabled: z.boolean().optional(),
  free_only: z.boolean().optional(),
  publisher_id: z.string().trim().min(3).max(80).optional(),
  meta_tag: z.string().trim().max(500).optional(),
  script_snippet: z.string().trim().max(1000).optional(),
  ads_txt: z.string().trim().max(1000).optional(),
  disabled_pages: z.array(z.string().trim().max(120)).max(200).optional(),
});

export const monetizationUpdateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SettingsInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertOwner(supabase, userId);
    const { data: oldRow } = await supabase
      .from("monetization_settings")
      .select("*")
      .eq("id", true)
      .maybeSingle();
    const { error } = await supabase
      .from("monetization_settings")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", true);
    if (error) throw new Error("Falha ao salvar configurações.");
    await audit(
      supabase,
      userId,
      "monetization.settings.update",
      oldRow,
      data,
      "Atualização das configurações de monetização",
    );
    return { ok: true };
  });

const SlotUpsert = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120),
  position: z.string().trim().min(1).max(60),
  slot_code: z.string().trim().max(60).nullable().optional(),
  kind: z.string().trim().min(1).max(30),
  format: z.string().trim().min(1).max(30),
  active: z.boolean(),
  notes: z.string().trim().max(300).nullable().optional(),
});

export const monetizationUpsertSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SlotUpsert.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertOwner(supabase, userId);
    const payload = {
      name: data.name,
      position: data.position,
      slot_code: data.slot_code ?? null,
      kind: data.kind,
      format: data.format,
      active: data.active,
      notes: data.notes ?? null,
    };
    if (data.id) {
      const { error } = await supabase.from("ad_slots").update(payload).eq("id", data.id);
      if (error) throw new Error("Falha ao atualizar slot.");
      await audit(
        supabase,
        userId,
        "monetization.slot.update",
        { id: data.id },
        payload,
        `Slot atualizado: ${data.name}`,
      );
      return { ok: true, id: data.id };
    }
    const { data: inserted, error } = await supabase
      .from("ad_slots")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error("Falha ao criar slot.");
    await audit(
      supabase,
      userId,
      "monetization.slot.create",
      null,
      payload,
      `Slot criado: ${data.name}`,
    );
    return { ok: true, id: (inserted as { id: string }).id };
  });

const DeleteInput = z.object({ id: z.string().uuid() });

export const monetizationDeleteSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DeleteInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertOwner(supabase, userId);
    const { error } = await supabase.from("ad_slots").delete().eq("id", data.id);
    if (error) throw new Error("Falha ao remover slot.");
    await audit(
      supabase,
      userId,
      "monetization.slot.delete",
      { id: data.id },
      null,
      "Slot removido",
    );
    return { ok: true };
  });
