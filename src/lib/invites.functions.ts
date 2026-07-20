// BlogAI Pro — Onda 5: server fns do sistema de convites.
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  autoQualifyInvite,
  ensureCodeFor,
  getInviteStatusFor,
  redeemCodeFor,
  type InviteStatus,
} from "./invites.server";

function requestOrigin(): string {
  try {
    const req = getRequest();
    if (req) return new URL(req.url).origin;
  } catch {
    /* ignore */
  }
  return "https://monzart.com.br";
}

export const getMyInviteStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<InviteStatus> => {
    return getInviteStatusFor(context.supabase, context.userId, requestOrigin());
  });

export const ensureMyInviteCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ code: string; invite_link: string }> => {
    const code = await ensureCodeFor(context.supabase);
    return { code, invite_link: `${requestOrigin()}/signup?ref=${code}` };
  });

const RedeemSchema = z.object({ code: z.string().trim().min(3).max(20) });

export const redeemInviteCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => RedeemSchema.parse(raw))
  .handler(async ({ data, context }): Promise<{ ok: boolean; reason?: string }> => {
    return redeemCodeFor(context.supabase, data.code);
  });

export const qualifyMyInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({
      context,
    }): Promise<{ ok: boolean; skipped?: boolean; reason?: string; credits?: number }> => {
      return autoQualifyInvite(context.supabase, context.userId);
    },
  );
