-- Ensure one subscription per user (dedupe then unique constraint)
DELETE FROM public.subscriptions a
USING public.subscriptions b
WHERE a.user_id = b.user_id AND a.ctid < b.ctid;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_user_id_key UNIQUE (user_id);

-- Atomic, idempotent payment activation used by the webhook / status check
CREATE OR REPLACE FUNCTION public.activate_payment(p_payment_id uuid, p_external_id text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_plan public.plans%ROWTYPE;
  v_credits integer;
  v_period_end timestamptz;
BEGIN
  SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'payment_not_found');
  END IF;

  IF v_payment.status = 'paid' THEN
    RETURN jsonb_build_object('ok', true, 'reason', 'already_paid', 'plan_id', v_payment.plan_id);
  END IF;

  SELECT * INTO v_plan FROM public.plans WHERE id = v_payment.plan_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'plan_not_found');
  END IF;

  UPDATE public.payments
    SET status = 'paid',
        paid_at = now(),
        external_id = COALESCE(p_external_id, external_id),
        updated_at = now()
    WHERE id = p_payment_id;

  v_period_end := now() + interval '30 days';

  INSERT INTO public.subscriptions (user_id, plan_id, status, started_at, current_period_end)
  VALUES (v_payment.user_id, v_payment.plan_id, 'active', now(), v_period_end)
  ON CONFLICT (user_id) DO UPDATE
    SET plan_id = EXCLUDED.plan_id,
        status = 'active',
        started_at = now(),
        current_period_end = EXCLUDED.current_period_end,
        updated_at = now();

  IF v_plan.is_unlimited THEN
    v_credits := 999999;
  ELSE
    v_credits := v_plan.monthly_credits;
  END IF;

  UPDATE public.profiles
    SET plan = v_payment.plan_id::user_plan,
        credits = v_credits,
        updated_at = now()
    WHERE id = v_payment.user_id;

  INSERT INTO public.credit_transactions (user_id, type, amount, balance_after, description)
  VALUES (
    v_payment.user_id,
    'purchase',
    v_credits,
    v_credits,
    CASE WHEN v_plan.is_unlimited
      THEN 'Plano ' || v_plan.name || ' (créditos ilimitados)'
      ELSE 'Créditos do plano ' || v_plan.name
    END
  );

  INSERT INTO public.financial_logs (event, level, payload, user_id)
  VALUES (
    'payment.activated',
    'info',
    jsonb_build_object('payment_id', p_payment_id, 'plan_id', v_payment.plan_id, 'external_id', p_external_id),
    v_payment.user_id
  );

  RETURN jsonb_build_object('ok', true, 'plan_id', v_payment.plan_id);
END;
$$;

REVOKE ALL ON FUNCTION public.activate_payment(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_payment(uuid, text) TO service_role;