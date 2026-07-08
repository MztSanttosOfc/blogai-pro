import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequestUrl } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CreatePixInput = z.object({
  planId: z.enum(["pro", "premium", "teste"]),
  cpf: z
    .string()
    .trim()
    .regex(/^\d{11}$/, "CPF deve conter 11 dígitos."),
  phone: z
    .string()
    .trim()
    .regex(/^\d{10,11}$/, "Telefone deve conter DDD + número."),
});

/** Creates a Pix charge for a paid plan and persists a pending payment. */
export const createPixPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreatePixInput.parse(input))
  .handler(async ({ data, context }) => {
    const { userId, claims } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createCashIn } = await import("./syncpay.server");

    const { data: plan } = await supabaseAdmin
      .from("plans")
      .select("id, name, price_cents, active")
      .eq("id", data.planId)
      .single();

    if (!plan || !plan.active || plan.price_cents <= 0) {
      throw new Error("Plano inválido para pagamento.");
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email")
      .eq("id", userId)
      .single();

    const email = (profile?.email || (claims?.email as string) || "").trim();
    const name = (profile?.full_name || email.split("@")[0] || "Cliente").trim();
    if (!email) throw new Error("E-mail do usuário não encontrado.");

    const origin = new URL(getRequestUrl()).origin;
    const webhookUrl = `${origin}/api/public/webhooks/syncpay`;

    const charge = await createCashIn({
      amount: plan.price_cents / 100,
      description: `Assinatura ${plan.name} — BlogAI Pro`,
      webhookUrl,
      client: { name, cpf: data.cpf, email, phone: data.phone },
    });

    const { data: payment, error } = await supabaseAdmin
      .from("payments")
      .insert({
        user_id: userId,
        plan_id: plan.id,
        amount_cents: plan.price_cents,
        method: "pix",
        status: "pending",
        external_id: charge.identifier,
        pix_copy_paste: charge.pixCode,
        pix_qr_code: charge.pixCode,
        metadata: { provider: "syncpay" },
      })
      .select("id")
      .single();

    if (error || !payment) throw new Error("Falha ao registrar o pagamento.");

    await supabaseAdmin.from("financial_logs").insert({
      event: "payment.created",
      level: "info",
      user_id: userId,
      payload: { payment_id: payment.id, plan_id: plan.id, identifier: charge.identifier },
    });

    return {
      paymentId: payment.id as string,
      pixCode: charge.pixCode,
      amountCents: plan.price_cents,
      planName: plan.name as string,
    };
  });

const CheckInput = z.object({ paymentId: z.string().uuid() });

/**
 * Verifies a payment by independently querying SyncPay for the real transaction
 * status, then activates the plan if confirmed. Used both as a manual fallback
 * and to confirm payments without relying on a webhook secret.
 */
export const checkPaymentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CheckInput.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getTransaction } = await import("./syncpay.server");

    const { data: payment } = await supabaseAdmin
      .from("payments")
      .select("id, user_id, status, external_id")
      .eq("id", data.paymentId)
      .single();

    if (!payment || payment.user_id !== userId) {
      throw new Error("Pagamento não encontrado.");
    }
    if (payment.status === "paid") return { status: "paid" as const };
    if (!payment.external_id) return { status: "pending" as const };

    const tx = await getTransaction(payment.external_id);
    if (tx.status === "completed") {
      const { error } = await supabaseAdmin.rpc("activate_payment", {
        p_payment_id: payment.id,
        p_external_id: payment.external_id,
      });
      if (error) throw new Error("Falha ao ativar o plano.");
      return { status: "paid" as const };
    }
    if (tx.status === "failed" || tx.status === "refunded") {
      return { status: "failed" as const };
    }
    return { status: "pending" as const };
  });

/** Returns the user's plan, subscription, payment history and credit ledger. */
export const getFinancialOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;

    const [{ data: subscription }, { data: payments }, { data: credits }] = await Promise.all([
      supabase
        .from("subscriptions")
        .select("plan_id, status, started_at, current_period_end")
        .maybeSingle(),
      supabase
        .from("payments")
        .select("id, plan_id, amount_cents, method, status, created_at, paid_at")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("credit_transactions")
        .select("id, type, amount, balance_after, description, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    return {
      subscription: subscription ?? null,
      payments: payments ?? [],
      credits: credits ?? [],
    };
  });
