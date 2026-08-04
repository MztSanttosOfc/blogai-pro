// BlogAI Pro — exclusão de conta (LGPD/GDPR + requisito Google Play).
// Remove ou anonimiza os dados do usuário autenticado.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Admin = SupabaseClient<Database>;

/** Tabelas cujo dado pessoal é removido por completo (chave = coluna do usuário). */
const USER_OWNED_TABLES: { table: string; column: string }[] = [
  { table: "articles", column: "user_id" },
  { table: "pages", column: "user_id" },
  { table: "content_clusters", column: "user_id" },
  { table: "scheduled_posts", column: "user_id" },
  { table: "blogger_connections", column: "user_id" },
  { table: "user_smart_profile", column: "user_id" },
  { table: "user_activity_logs", column: "user_id" },
  { table: "invite_codes", column: "user_id" },
  { table: "api_keys", column: "user_id" },
  { table: "credit_transactions", column: "user_id" },
  { table: "subscriptions", column: "user_id" },
  { table: "user_roles", column: "user_id" },
  { table: "profiles", column: "id" },
];

export interface AccountDeletionResult {
  deleted: string[];
  skipped: string[];
}

export async function purgeUserData(admin: Admin, userId: string): Promise<AccountDeletionResult> {
  const deleted: string[] = [];
  const skipped: string[] = [];

  // Anonimiza registros financeiros (obrigação legal de retenção).
  try {
    await admin
      .from("payments" as never)
      .update({ user_id: null } as never)
      .eq("user_id", userId);
  } catch {
    /* tabela pode não existir ou exigir user_id — mantida intacta */
  }

  for (const { table, column } of USER_OWNED_TABLES) {
    const { error } = await admin
      .from(table as never)
      .delete()
      .eq(column, userId);
    if (error) skipped.push(table);
    else deleted.push(table);
  }

  // Remove avatar do storage (best effort).
  try {
    const { data: files } = await admin.storage.from("avatars").list(userId);
    if (files?.length) {
      await admin.storage.from("avatars").remove(files.map((f) => `${userId}/${f.name}`));
    }
  } catch {
    skipped.push("avatars");
  }

  const { error: authError } = await admin.auth.admin.deleteUser(userId);
  if (authError) throw new Error(authError.message);

  return { deleted, skipped };
}
