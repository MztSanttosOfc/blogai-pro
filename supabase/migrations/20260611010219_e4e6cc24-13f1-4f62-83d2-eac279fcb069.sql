-- =========================================================
-- 1. Roles enum + user_roles table
-- =========================================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer helpers (avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('owner','admin')
  );
$$;

-- Policies: users see own roles; admins see/manage all
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- =========================================================
-- 2. Admin audit logs
-- =========================================================
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_email text,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  target_email text,
  old_value jsonb,
  new_value jsonb,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.admin_audit_logs TO authenticated;
GRANT ALL ON public.admin_audit_logs TO service_role;

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs" ON public.admin_audit_logs
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON public.admin_audit_logs (created_at DESC);

-- =========================================================
-- 3. Admin RPC functions (all enforce admin role)
-- =========================================================

-- List all users with details
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  plan public.user_plan,
  credits integer,
  created_at timestamptz,
  subscription_status text,
  last_sign_in_at timestamptz,
  role public.app_role
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.full_name,
    p.plan,
    p.credits,
    p.created_at,
    COALESCE(s.status::text, 'none') AS subscription_status,
    u.last_sign_in_at,
    (SELECT ur.role FROM public.user_roles ur
       WHERE ur.user_id = p.id
       ORDER BY CASE ur.role WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 ELSE 3 END
       LIMIT 1) AS role
  FROM public.profiles p
  LEFT JOIN public.subscriptions s ON s.user_id = p.id
  LEFT JOIN auth.users u ON u.id = p.id
  ORDER BY p.created_at DESC;
END;
$$;

-- Aggregated statistics
CREATE OR REPLACE FUNCTION public.admin_stats()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT jsonb_build_object(
    'total_users', (SELECT count(*) FROM public.profiles),
    'free_users', (SELECT count(*) FROM public.profiles WHERE plan = 'free'),
    'pro_users', (SELECT count(*) FROM public.profiles WHERE plan = 'pro'),
    'premium_users', (SELECT count(*) FROM public.profiles WHERE plan = 'premium'),
    'teste_users', (SELECT count(*) FROM public.profiles WHERE plan = 'teste'),
    'total_payments', (SELECT count(*) FROM public.payments WHERE status = 'paid'),
    'total_revenue_cents', (SELECT COALESCE(sum(amount_cents),0) FROM public.payments WHERE status = 'paid'),
    'credits_distributed', (SELECT COALESCE(sum(amount),0) FROM public.credit_transactions WHERE amount > 0),
    'credits_consumed', (SELECT COALESCE(abs(sum(amount)),0) FROM public.credit_transactions WHERE amount < 0),
    'new_users_7d', (SELECT count(*) FROM public.profiles WHERE created_at > now() - interval '7 days'),
    'new_users_30d', (SELECT count(*) FROM public.profiles WHERE created_at > now() - interval '30 days'),
    'total_articles', (SELECT count(*) FROM public.articles)
  ) INTO result;

  RETURN result;
END;
$$;

-- Manually change a user's plan
CREATE OR REPLACE FUNCTION public.admin_set_plan(p_user_id uuid, p_plan public.user_plan)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_old public.user_plan;
  v_credits integer;
  v_target_email text;
  v_admin_email text;
BEGIN
  IF NOT public.is_admin(v_admin) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT plan, email INTO v_old, v_target_email FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'user_not_found'; END IF;
  SELECT email INTO v_admin_email FROM public.profiles WHERE id = v_admin;

  v_credits := CASE p_plan
    WHEN 'premium' THEN 999999
    WHEN 'pro' THEN 150
    WHEN 'teste' THEN 10
    ELSE 10 END;

  UPDATE public.profiles
    SET plan = p_plan, credits = v_credits, updated_at = now()
    WHERE id = p_user_id;

  INSERT INTO public.subscriptions (user_id, plan_id, status, started_at, current_period_end)
  VALUES (p_user_id, p_plan::text, 'active', now(), now() + interval '30 days')
  ON CONFLICT (user_id) DO UPDATE
    SET plan_id = EXCLUDED.plan_id, status = 'active',
        started_at = now(), current_period_end = EXCLUDED.current_period_end, updated_at = now();

  INSERT INTO public.credit_transactions (user_id, type, amount, balance_after, description)
  VALUES (p_user_id, 'grant', v_credits, v_credits, 'Plano alterado pelo administrador: ' || p_plan);

  INSERT INTO public.admin_audit_logs (action, admin_id, admin_email, target_user_id, target_email, old_value, new_value, details)
  VALUES ('plan.change', v_admin, v_admin_email, p_user_id, v_target_email,
          jsonb_build_object('plan', v_old), jsonb_build_object('plan', p_plan),
          'Plano alterado de ' || v_old || ' para ' || p_plan);

  RETURN jsonb_build_object('ok', true, 'plan', p_plan, 'credits', v_credits);
END;
$$;

-- Manually adjust a user's credits (add / remove / set)
CREATE OR REPLACE FUNCTION public.admin_adjust_credits(
  p_user_id uuid, p_mode text, p_amount integer, p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_old integer;
  v_new integer;
  v_target_email text;
  v_admin_email text;
BEGIN
  IF NOT public.is_admin(v_admin) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF p_mode NOT IN ('add','remove','set') THEN
    RAISE EXCEPTION 'invalid_mode';
  END IF;
  IF p_amount < 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;

  SELECT credits, email INTO v_old, v_target_email FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'user_not_found'; END IF;
  SELECT email INTO v_admin_email FROM public.profiles WHERE id = v_admin;

  v_new := CASE p_mode
    WHEN 'add' THEN v_old + p_amount
    WHEN 'remove' THEN GREATEST(0, v_old - p_amount)
    ELSE p_amount END;

  UPDATE public.profiles SET credits = v_new, updated_at = now() WHERE id = p_user_id;

  INSERT INTO public.credit_transactions (user_id, type, amount, balance_after, description)
  VALUES (p_user_id,
          CASE WHEN v_new >= v_old THEN 'grant' ELSE 'spend' END,
          v_new - v_old, v_new,
          COALESCE(p_reason, 'Ajuste manual de créditos pelo administrador'));

  INSERT INTO public.admin_audit_logs (action, admin_id, admin_email, target_user_id, target_email, old_value, new_value, details)
  VALUES ('credits.adjust', v_admin, v_admin_email, p_user_id, v_target_email,
          jsonb_build_object('credits', v_old), jsonb_build_object('credits', v_new),
          COALESCE(p_reason, 'Ajuste manual (' || p_mode || ' ' || p_amount || ')'));

  RETURN jsonb_build_object('ok', true, 'credits', v_new);
END;
$$;

-- List audit logs
CREATE OR REPLACE FUNCTION public.admin_list_audit_logs(p_limit integer DEFAULT 200)
RETURNS SETOF public.admin_audit_logs
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT * FROM public.admin_audit_logs
  ORDER BY created_at DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 500);
END;
$$;

-- =========================================================
-- 4. Bootstrap the owner account (permanent premium + unlimited)
-- =========================================================
INSERT INTO public.user_roles (user_id, role)
VALUES ('416ec366-69d7-42ec-80e7-e650e660afdd', 'owner')
ON CONFLICT (user_id, role) DO NOTHING;

UPDATE public.profiles
  SET plan = 'premium', credits = 999999, updated_at = now()
  WHERE id = '416ec366-69d7-42ec-80e7-e650e660afdd';

INSERT INTO public.subscriptions (user_id, plan_id, status, started_at, current_period_end)
VALUES ('416ec366-69d7-42ec-80e7-e650e660afdd', 'premium', 'active', now(), now() + interval '100 years')
ON CONFLICT (user_id) DO UPDATE
  SET plan_id = 'premium', status = 'active', current_period_end = now() + interval '100 years', updated_at = now();

-- =========================================================
-- 5. Article images column
-- =========================================================
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS images jsonb NOT NULL DEFAULT '[]'::jsonb;