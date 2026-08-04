// BlogAI Pro — server functions de conta (exclusão definitiva).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DeleteSchema = z.object({
  confirm: z.literal(true),
});

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => DeleteSchema.parse(raw))
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { purgeUserData } = await import("./account.server");
    const result = await purgeUserData(supabaseAdmin, context.userId);
    return { ok: true as const, ...result };
  });
