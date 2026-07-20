// BlogAI Pro — v1.1 Smart Profile: server functions (RPC).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  loadSmartProfile,
  saveSmartProfile,
  type SmartProfileFull,
  type SmartProfileUpsert,
} from "./smart-profile.server";

const LinkSchema = z.object({
  label: z.string().trim().min(1).max(80),
  url: z.string().trim().url().max(500),
});

const UpsertSchema = z.object({
  personal: z.record(z.string(), z.any()).optional(),
  contacts: z.record(z.string(), z.any()).optional(),
  social_links: z.record(z.string(), z.any()).optional(),
  blogger: z.record(z.string(), z.any()).optional(),
  seo_prefs: z.record(z.string(), z.any()).optional(),
  ai_prefs: z.record(z.string(), z.any()).optional(),
  default_links: z.array(LinkSchema).max(30).optional(),
  signature: z.string().max(500).nullable().optional(),
  feature_flags: z.record(z.string(), z.boolean()).optional(),
});

export const getSmartProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SmartProfileFull> => {
    return loadSmartProfile(context.supabase, context.userId);
  });

export const updateSmartProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => UpsertSchema.parse(raw) as SmartProfileUpsert)
  .handler(async ({ data, context }): Promise<SmartProfileFull> => {
    return saveSmartProfile(context.supabase, context.userId, data);
  });
