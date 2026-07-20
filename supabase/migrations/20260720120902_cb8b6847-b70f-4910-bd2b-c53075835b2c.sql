
-- =========================================================
-- Onda 5: Analytics, Activity Log e Sistema de Convites
-- =========================================================

-- 1) Enum de categorias de atividade
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'activity_category') THEN
    CREATE TYPE public.activity_category AS ENUM (
      'content','publish','image','payment','plan','credits','auth','feedback','profile','invite'
    );
  END IF;
END $$;

-- 2) Tabela user_activity_logs
CREATE TABLE IF NOT EXISTS public.user_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category public.activity_category NOT NULL,
  event text NOT NULL,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ual_user_created ON public.user_activity_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ual_user_category ON public.user_activity_logs (user_id, category);
CREATE INDEX IF NOT EXISTS idx_ual_created ON public.user_activity_logs (created_at DESC);

GRANT SELECT ON public.user_activity_logs TO authenticated;
GRANT ALL ON public.user_activity_logs TO service_role;

ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_own_read" ON public.user_activity_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "activity_admin_read" ON public.user_activity_logs
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- 3) invite_codes
CREATE TABLE IF NOT EXISTS public.invite_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON public.invite_codes (code);

GRANT SELECT ON public.invite_codes TO authenticated;
GRANT ALL ON public.invite_codes TO service_role;

ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invite_codes_own_read" ON public.invite_codes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "invite_codes_admin_read" ON public.invite_codes
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- 4) invite_redemptions
CREATE TABLE IF NOT EXISTS public.invite_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending | qualified | rewarded
  credits_awarded integer NOT NULL DEFAULT 0,
  qualified_at timestamptz,
  rewarded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_invite_red_inviter ON public.invite_redemptions (inviter_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invite_red_invitee ON public.invite_redemptions (invitee_id);
CREATE INDEX IF NOT EXISTS idx_invite_red_status ON public.invite_redemptions (status);

GRANT SELECT ON public.invite_redemptions TO authenticated;
GRANT ALL ON public.invite_redemptions TO service_role;

ALTER TABLE public.invite_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invite_red_own_read" ON public.invite_redemptions
  FOR SELECT TO authenticated
  USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);
CREATE POLICY "invite_red_admin_read" ON public.invite_redemptions
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- 5) Função: log_user_activity (SECURITY DEFINER, callable por authenticated)
CREATE OR REPLACE FUNCTION public.log_user_activity(
  _user_id uuid,
  _category public.activity_category,
  _event text,
  _description text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  IF _user_id IS NULL THEN RETURN NULL; END IF;
  INSERT INTO public.user_activity_logs (user_id, category, event, description, metadata)
  VALUES (_user_id, _category, _event, _description, COALESCE(_metadata, '{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.log_user_activity(uuid, public.activity_category, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_user_activity(uuid, public.activity_category, text, text, jsonb) TO authenticated, service_role;

-- 6) Gerador determinístico de código curto
CREATE OR REPLACE FUNCTION public._generate_invite_code() RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  i int;
  tries int := 0;
BEGIN
  LOOP
    v_code := '';
    FOR i IN 1..7 LOOP
      v_code := v_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    IF NOT EXISTS (SELECT 1 FROM public.invite_codes WHERE code = v_code) THEN
      RETURN v_code;
    END IF;
    tries := tries + 1;
    IF tries > 10 THEN RETURN v_code || substr(md5(random()::text), 1, 4); END IF;
  END LOOP;
END;
$$;

-- 7) ensure_invite_code — retorna/gera o código do usuário atual
CREATE OR REPLACE FUNCTION public.ensure_invite_code() RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid(); v_code text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  SELECT code INTO v_code FROM public.invite_codes WHERE user_id = v_uid;
  IF v_code IS NOT NULL THEN RETURN v_code; END IF;
  v_code := public._generate_invite_code();
  INSERT INTO public.invite_codes (user_id, code) VALUES (v_uid, v_code)
    ON CONFLICT (user_id) DO UPDATE SET code = public.invite_codes.code
    RETURNING code INTO v_code;
  RETURN v_code;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_invite_code() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_invite_code() TO authenticated, service_role;

-- 8) invite_redeem — associa o usuário atual como invitee do código informado
CREATE OR REPLACE FUNCTION public.invite_redeem(_code text) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_inviter uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF _code IS NULL OR length(trim(_code)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_code');
  END IF;

  SELECT user_id INTO v_inviter FROM public.invite_codes WHERE code = upper(trim(_code));
  IF v_inviter IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'code_not_found');
  END IF;
  IF v_inviter = v_uid THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'self_invite');
  END IF;
  IF EXISTS (SELECT 1 FROM public.invite_redemptions WHERE invitee_id = v_uid) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_redeemed');
  END IF;

  INSERT INTO public.invite_redemptions (inviter_id, invitee_id, code, status)
  VALUES (v_inviter, v_uid, upper(trim(_code)), 'pending');

  PERFORM public.log_user_activity(v_inviter, 'invite'::public.activity_category,
    'invite.redeemed', 'Novo convidado registrado', jsonb_build_object('invitee_id', v_uid));
  PERFORM public.log_user_activity(v_uid, 'invite'::public.activity_category,
    'invite.joined', 'Você entrou através de um convite', jsonb_build_object('inviter_id', v_inviter));

  RETURN jsonb_build_object('ok', true, 'inviter_id', v_inviter);
END;
$$;

REVOKE ALL ON FUNCTION public.invite_redeem(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.invite_redeem(text) TO authenticated, service_role;

-- 9) invite_qualify_and_reward — idempotente por invitee
CREATE OR REPLACE FUNCTION public.invite_qualify_and_reward(_invitee_id uuid) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reward int := 30;
  v_row public.invite_redemptions%ROWTYPE;
  v_balance int;
BEGIN
  IF _invitee_id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_invitee'); END IF;

  SELECT * INTO v_row FROM public.invite_redemptions WHERE invitee_id = _invitee_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_invited'); END IF;
  IF v_row.status = 'rewarded' THEN
    RETURN jsonb_build_object('ok', true, 'reason', 'already_rewarded');
  END IF;

  UPDATE public.profiles
    SET credits = credits + v_reward, updated_at = now()
    WHERE id = v_row.inviter_id
  RETURNING credits INTO v_balance;

  IF v_balance IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'inviter_missing');
  END IF;

  INSERT INTO public.credit_transactions (user_id, type, amount, balance_after, description)
  VALUES (v_row.inviter_id, 'grant', v_reward, v_balance,
          'Recompensa por indicação: novo usuário qualificado');

  UPDATE public.invite_redemptions
    SET status = 'rewarded',
        credits_awarded = v_reward,
        qualified_at = COALESCE(qualified_at, now()),
        rewarded_at = now()
    WHERE id = v_row.id;

  PERFORM public.log_user_activity(v_row.inviter_id, 'credits'::public.activity_category,
    'invite.reward', 'Você ganhou 30 créditos por indicação',
    jsonb_build_object('invitee_id', _invitee_id, 'amount', v_reward));

  RETURN jsonb_build_object('ok', true, 'credits', v_reward);
END;
$$;

REVOKE ALL ON FUNCTION public.invite_qualify_and_reward(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.invite_qualify_and_reward(uuid) TO authenticated, service_role;

-- 10) analytics_user_overview — métricas globais para admins
CREATE OR REPLACE FUNCTION public.analytics_user_overview() RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT jsonb_build_object(
    'content', jsonb_build_object(
      'articles_total', (SELECT count(*) FROM public.articles),
      'articles_published', (SELECT count(*) FROM public.articles WHERE COALESCE(published, false) = true),
      'articles_scheduled', (SELECT count(*) FROM public.scheduled_posts WHERE status IN ('pending','scheduled')),
      'pages_total', (SELECT count(*) FROM public.site_pages),
      'pages_published', (SELECT count(*) FROM public.site_pages WHERE COALESCE(published, false) = true)
    ),
    'users', jsonb_build_object(
      'total', (SELECT count(*) FROM public.profiles),
      'new_7d', (SELECT count(*) FROM public.profiles WHERE created_at > now() - interval '7 days'),
      'new_30d', (SELECT count(*) FROM public.profiles WHERE created_at > now() - interval '30 days'),
      'active_7d', (SELECT count(DISTINCT user_id) FROM public.user_activity_logs WHERE created_at > now() - interval '7 days'),
      'active_30d', (SELECT count(DISTINCT user_id) FROM public.user_activity_logs WHERE created_at > now() - interval '30 days'),
      'by_plan', (SELECT jsonb_object_agg(plan::text, cnt) FROM (
        SELECT plan, count(*) AS cnt FROM public.profiles GROUP BY plan) t)
    ),
    'credits', jsonb_build_object(
      'granted', (SELECT COALESCE(sum(amount),0) FROM public.credit_transactions WHERE amount > 0 AND type IN ('grant','renewal')),
      'purchased', (SELECT COALESCE(sum(amount),0) FROM public.credit_transactions WHERE amount > 0 AND type = 'purchase'),
      'consumed', (SELECT COALESCE(abs(sum(amount)),0) FROM public.credit_transactions WHERE amount < 0),
      'avg_per_user', (SELECT COALESCE(ROUND(avg(credits))::int, 0) FROM public.profiles)
    ),
    'usage', jsonb_build_object(
      'articles_per_user', (SELECT COALESCE(ROUND(avg(cnt), 2), 0) FROM (
        SELECT count(*) cnt FROM public.articles GROUP BY user_id) s),
      'pages_per_user', (SELECT COALESCE(ROUND(avg(cnt), 2), 0) FROM (
        SELECT count(*) cnt FROM public.site_pages GROUP BY user_id) s),
      'events_24h', (SELECT count(*) FROM public.user_activity_logs WHERE created_at > now() - interval '1 day'),
      'events_7d', (SELECT count(*) FROM public.user_activity_logs WHERE created_at > now() - interval '7 days')
    ),
    'ai', jsonb_build_object(
      'top_categories', (SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM (
        SELECT category, count(*) AS total FROM public.articles
        WHERE category IS NOT NULL AND length(category) > 0
        GROUP BY category ORDER BY total DESC LIMIT 8) t),
      'invites', jsonb_build_object(
        'total', (SELECT count(*) FROM public.invite_redemptions),
        'rewarded', (SELECT count(*) FROM public.invite_redemptions WHERE status = 'rewarded'),
        'credits_distributed', (SELECT COALESCE(sum(credits_awarded), 0) FROM public.invite_redemptions)
      )
    )
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.analytics_user_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.analytics_user_overview() TO authenticated, service_role;
