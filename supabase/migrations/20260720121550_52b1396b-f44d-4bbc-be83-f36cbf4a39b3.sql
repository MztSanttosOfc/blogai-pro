
-- =========================================================================
-- Onda 5 — Activity Timeline, Invites (Refer & Earn), Global Analytics
-- =========================================================================

-- 1) ACTIVITY LOGS ---------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.activity_category AS ENUM (
    'content','publish','image','payment','plan','credits','auth','feedback','profile','invite'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category public.activity_category NOT NULL,
  event TEXT NOT NULL,
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_activity_logs_user_created_idx
  ON public.user_activity_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS user_activity_logs_category_idx
  ON public.user_activity_logs (category);

GRANT SELECT ON public.user_activity_logs TO authenticated;
GRANT ALL ON public.user_activity_logs TO service_role;
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own activity" ON public.user_activity_logs;
CREATE POLICY "users read own activity" ON public.user_activity_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admins read all activity" ON public.user_activity_logs;
CREATE POLICY "admins read all activity" ON public.user_activity_logs
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- 2) INVITES ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invite_codes (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS invite_codes_code_idx ON public.invite_codes (code);

GRANT SELECT ON public.invite_codes TO authenticated;
GRANT ALL ON public.invite_codes TO service_role;
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own invite code" ON public.invite_codes;
CREATE POLICY "users read own invite code" ON public.invite_codes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.invite_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','qualified','rewarded')),
  credits_awarded INTEGER NOT NULL DEFAULT 0,
  qualified_at TIMESTAMPTZ,
  rewarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS invite_redemptions_inviter_idx ON public.invite_redemptions (inviter_id, created_at DESC);
CREATE INDEX IF NOT EXISTS invite_redemptions_status_idx ON public.invite_redemptions (status);

GRANT SELECT ON public.invite_redemptions TO authenticated;
GRANT ALL ON public.invite_redemptions TO service_role;
ALTER TABLE public.invite_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inviter reads own redemptions" ON public.invite_redemptions;
CREATE POLICY "inviter reads own redemptions" ON public.invite_redemptions
  FOR SELECT TO authenticated USING (auth.uid() = inviter_id);

DROP POLICY IF EXISTS "invitee reads own redemption" ON public.invite_redemptions;
CREATE POLICY "invitee reads own redemption" ON public.invite_redemptions
  FOR SELECT TO authenticated USING (auth.uid() = invitee_id);

DROP POLICY IF EXISTS "admins read all redemptions" ON public.invite_redemptions;
CREATE POLICY "admins read all redemptions" ON public.invite_redemptions
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- 3) FUNCTIONS -------------------------------------------------------------

-- 3.1 log_user_activity — fire-and-forget entry point
CREATE OR REPLACE FUNCTION public.log_user_activity(
  _user_id UUID,
  _category public.activity_category,
  _event TEXT,
  _description TEXT DEFAULT NULL,
  _metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id UUID;
BEGIN
  -- caller must be admin OR the owner of the event
  IF auth.uid() IS NULL OR (auth.uid() <> _user_id AND NOT public.is_admin(auth.uid())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  INSERT INTO public.user_activity_logs (user_id, category, event, description, metadata)
    VALUES (_user_id, _category, _event, _description, COALESCE(_metadata, '{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION public.log_user_activity(uuid, public.activity_category, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_user_activity(uuid, public.activity_category, text, text, jsonb) TO authenticated, service_role;

-- 3.2 ensure_invite_code — returns or generates a short unique code
CREATE OR REPLACE FUNCTION public.ensure_invite_code() RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_code TEXT;
  v_try INTEGER := 0;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  SELECT code INTO v_code FROM public.invite_codes WHERE user_id = v_uid;
  IF v_code IS NOT NULL THEN RETURN v_code; END IF;
  LOOP
    v_try := v_try + 1;
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 7));
    BEGIN
      INSERT INTO public.invite_codes (user_id, code) VALUES (v_uid, v_code);
      RETURN v_code;
    EXCEPTION WHEN unique_violation THEN
      IF v_try > 10 THEN RAISE EXCEPTION 'code_generation_failed'; END IF;
    END;
  END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.ensure_invite_code() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_invite_code() TO authenticated, service_role;

-- 3.3 invite_redeem — invitee registers the code they signed up with
CREATE OR REPLACE FUNCTION public.invite_redeem(_code TEXT) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_inviter UUID;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF _code IS NULL OR length(trim(_code)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'empty_code');
  END IF;
  SELECT user_id INTO v_inviter FROM public.invite_codes WHERE code = upper(trim(_code));
  IF v_inviter IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_code');
  END IF;
  IF v_inviter = v_uid THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'self_invite');
  END IF;
  IF EXISTS (SELECT 1 FROM public.invite_redemptions WHERE invitee_id = v_uid) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_redeemed');
  END IF;
  INSERT INTO public.invite_redemptions (inviter_id, invitee_id, code, status)
    VALUES (v_inviter, v_uid, upper(trim(_code)), 'pending');
  RETURN jsonb_build_object('ok', true, 'inviter_id', v_inviter);
END $$;

REVOKE ALL ON FUNCTION public.invite_redeem(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.invite_redeem(text) TO authenticated, service_role;

-- 3.4 invite_qualify_and_reward — idempotent: rewards inviter with 30 credits
CREATE OR REPLACE FUNCTION public.invite_qualify_and_reward(_invitee_id UUID) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.invite_redemptions%ROWTYPE;
  v_credits INTEGER := 30;
  v_balance INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF auth.uid() <> _invitee_id AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT * INTO v_row FROM public.invite_redemptions WHERE invitee_id = _invitee_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', true, 'skipped', true, 'reason', 'not_invited'); END IF;
  IF v_row.status = 'rewarded' THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true, 'reason', 'already_rewarded');
  END IF;

  UPDATE public.profiles
     SET credits = credits + v_credits, updated_at = now()
   WHERE id = v_row.inviter_id
  RETURNING credits INTO v_balance;

  INSERT INTO public.credit_transactions (user_id, type, amount, balance_after, description)
  VALUES (v_row.inviter_id, 'grant', v_credits, v_balance,
          'Recompensa por indicação qualificada');

  UPDATE public.invite_redemptions
     SET status = 'rewarded',
         credits_awarded = v_credits,
         qualified_at = COALESCE(qualified_at, now()),
         rewarded_at = now()
   WHERE id = v_row.id;

  INSERT INTO public.user_activity_logs (user_id, category, event, description, metadata)
  VALUES (v_row.inviter_id, 'invite', 'invite.rewarded',
          'Indicação recompensada (+' || v_credits || ' créditos)',
          jsonb_build_object('invitee_id', _invitee_id, 'credits', v_credits));

  RETURN jsonb_build_object('ok', true, 'credits', v_credits);
END $$;

REVOKE ALL ON FUNCTION public.invite_qualify_and_reward(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.invite_qualify_and_reward(uuid) TO authenticated, service_role;

-- 3.5 analytics_user_overview — admin-only aggregate
CREATE OR REPLACE FUNCTION public.analytics_user_overview() RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_users INTEGER;
  v_result JSONB;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT count(*) INTO v_users FROM public.profiles;

  SELECT jsonb_build_object(
    'content', jsonb_build_object(
      'articles_total', (SELECT count(*) FROM public.articles),
      'articles_published', (SELECT count(*) FROM public.articles WHERE status = 'published'),
      'articles_scheduled', (SELECT count(*) FROM public.scheduled_posts WHERE status IN ('scheduled','pending')),
      'pages_total', (SELECT count(*) FROM public.site_pages),
      'pages_published', (SELECT count(*) FROM public.site_pages WHERE status = 'published')
    ),
    'users', jsonb_build_object(
      'total', v_users,
      'new_7d', (SELECT count(*) FROM public.profiles WHERE created_at > now() - interval '7 days'),
      'new_30d', (SELECT count(*) FROM public.profiles WHERE created_at > now() - interval '30 days'),
      'active_7d', (SELECT count(DISTINCT user_id) FROM public.user_activity_logs WHERE created_at > now() - interval '7 days'),
      'active_30d', (SELECT count(DISTINCT user_id) FROM public.user_activity_logs WHERE created_at > now() - interval '30 days'),
      'by_plan', COALESCE((SELECT jsonb_object_agg(plan, cnt) FROM (
        SELECT plan::text AS plan, count(*) AS cnt FROM public.profiles GROUP BY plan
      ) s), '{}'::jsonb)
    ),
    'credits', jsonb_build_object(
      'granted', COALESCE((SELECT sum(amount) FROM public.credit_transactions WHERE type = 'grant' AND amount > 0), 0),
      'purchased', COALESCE((SELECT sum(amount) FROM public.credit_transactions WHERE type = 'purchase' AND amount > 0), 0),
      'consumed', COALESCE((SELECT abs(sum(amount)) FROM public.credit_transactions WHERE amount < 0), 0),
      'avg_per_user', CASE WHEN v_users > 0 THEN ROUND((SELECT COALESCE(sum(credits),0) FROM public.profiles)::numeric / v_users, 1) ELSE 0 END
    ),
    'usage', jsonb_build_object(
      'articles_per_user', CASE WHEN v_users > 0 THEN ROUND((SELECT count(*) FROM public.articles)::numeric / v_users, 1) ELSE 0 END,
      'pages_per_user', CASE WHEN v_users > 0 THEN ROUND((SELECT count(*) FROM public.site_pages)::numeric / v_users, 1) ELSE 0 END,
      'events_24h', (SELECT count(*) FROM public.user_activity_logs WHERE created_at > now() - interval '1 day'),
      'events_7d', (SELECT count(*) FROM public.user_activity_logs WHERE created_at > now() - interval '7 days')
    ),
    'ai', jsonb_build_object(
      'top_categories', COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM (
        SELECT COALESCE(category, 'sem categoria') AS category, count(*)::int AS total
        FROM public.articles GROUP BY category ORDER BY total DESC LIMIT 8
      ) t), '[]'::jsonb),
      'invites', jsonb_build_object(
        'total', (SELECT count(*) FROM public.invite_redemptions),
        'rewarded', (SELECT count(*) FROM public.invite_redemptions WHERE status = 'rewarded'),
        'credits_distributed', COALESCE((SELECT sum(credits_awarded) FROM public.invite_redemptions), 0)
      )
    )
  ) INTO v_result;
  RETURN v_result;
END $$;

REVOKE ALL ON FUNCTION public.analytics_user_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.analytics_user_overview() TO authenticated, service_role;
