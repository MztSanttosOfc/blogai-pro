
-- =========================================================
-- Central de Recompensas (Rewards Center)
-- =========================================================

-- 1) Settings singleton ----------------------------------------------------
CREATE TABLE public.reward_settings (
  id boolean PRIMARY KEY DEFAULT true,
  enabled boolean NOT NULL DEFAULT true,
  content_source text NOT NULL DEFAULT 'official',
  blog_url text NOT NULL DEFAULT 'https://blog.monzart.com.br',
  auto_approve boolean NOT NULL DEFAULT true,
  credits_per_article integer NOT NULL DEFAULT 2,
  daily_credit_limit integer NOT NULL DEFAULT 20,
  daily_mission_limit integer NOT NULL DEFAULT 10,
  min_scroll_percent integer NOT NULL DEFAULT 85,
  seconds_per_100_words integer NOT NULL DEFAULT 12,
  pass_threshold integer NOT NULL DEFAULT 60,
  credits_by_difficulty jsonb NOT NULL DEFAULT '{"facil":1,"medio":2,"dificil":3}'::jsonb,
  credits_by_category jsonb NOT NULL DEFAULT '{}'::jsonb,
  eligible_categories text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reward_settings_singleton CHECK (id = true),
  CONSTRAINT reward_settings_source CHECK (content_source IN ('official','manual'))
);

GRANT SELECT ON public.reward_settings TO authenticated;
GRANT ALL ON public.reward_settings TO service_role;
ALTER TABLE public.reward_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read reward settings"
  ON public.reward_settings FOR SELECT TO authenticated USING (true);

INSERT INTO public.reward_settings (id) VALUES (true) ON CONFLICT DO NOTHING;

-- 2) Missions --------------------------------------------------------------
CREATE TABLE public.reward_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'official',
  url text NOT NULL,
  external_id text NOT NULL,
  title text NOT NULL,
  excerpt text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  difficulty text NOT NULL DEFAULT 'medio',
  word_count integer NOT NULL DEFAULT 0,
  estimated_read_seconds integer NOT NULL DEFAULT 60,
  credits integer NOT NULL DEFAULT 2,
  content text NOT NULL DEFAULT '',
  quiz jsonb,
  status text NOT NULL DEFAULT 'approved',
  published_at timestamptz,
  read_count integer NOT NULL DEFAULT 0,
  completion_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reward_missions_status CHECK (status IN ('pending','approved','rejected')),
  CONSTRAINT reward_missions_source CHECK (source IN ('official','manual')),
  UNIQUE (external_id)
);

GRANT SELECT ON public.reward_missions TO authenticated;
GRANT ALL ON public.reward_missions TO service_role;
ALTER TABLE public.reward_missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read approved missions"
  ON public.reward_missions FOR SELECT TO authenticated USING (status = 'approved');

-- 3) Completions -----------------------------------------------------------
CREATE TABLE public.reward_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_id uuid NOT NULL REFERENCES public.reward_missions(id) ON DELETE CASCADE,
  credits_awarded integer NOT NULL DEFAULT 0,
  score integer NOT NULL DEFAULT 0,
  total_questions integer NOT NULL DEFAULT 0,
  correct_answers integer NOT NULL DEFAULT 0,
  read_seconds integer NOT NULL DEFAULT 0,
  scroll_percent integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, mission_id)
);

GRANT SELECT ON public.reward_completions TO authenticated;
GRANT ALL ON public.reward_completions TO service_role;
ALTER TABLE public.reward_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read their own completions"
  ON public.reward_completions FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_reward_completions_user ON public.reward_completions(user_id, created_at);
CREATE INDEX idx_reward_missions_status ON public.reward_missions(status, published_at DESC);

-- 4) updated_at triggers ---------------------------------------------------
CREATE TRIGGER trg_reward_settings_updated
  BEFORE UPDATE ON public.reward_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_reward_missions_updated
  BEFORE UPDATE ON public.reward_missions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- FUNCTIONS
-- =========================================================

-- Config + today's usage for the current user
CREATE OR REPLACE FUNCTION public.reward_config()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_s public.reward_settings; v_uid uuid := auth.uid();
BEGIN
  SELECT * INTO v_s FROM public.reward_settings WHERE id = true;
  RETURN jsonb_build_object(
    'enabled', v_s.enabled,
    'content_source', v_s.content_source,
    'blog_url', v_s.blog_url,
    'auto_approve', v_s.auto_approve,
    'credits_per_article', v_s.credits_per_article,
    'daily_credit_limit', v_s.daily_credit_limit,
    'daily_mission_limit', v_s.daily_mission_limit,
    'min_scroll_percent', v_s.min_scroll_percent,
    'seconds_per_100_words', v_s.seconds_per_100_words,
    'pass_threshold', v_s.pass_threshold,
    'credits_by_difficulty', v_s.credits_by_difficulty,
    'credits_by_category', v_s.credits_by_category,
    'eligible_categories', to_jsonb(v_s.eligible_categories),
    'today_credits', COALESCE((SELECT sum(credits_awarded) FROM public.reward_completions
        WHERE user_id = v_uid AND created_at::date = now()::date), 0),
    'today_missions', COALESCE((SELECT count(*) FROM public.reward_completions
        WHERE user_id = v_uid AND created_at::date = now()::date), 0)
  );
END; $$;

-- Approved missions list with per-user completion flag
CREATE OR REPLACE FUNCTION public.reward_list_missions()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(row ORDER BY (row->>'published_at') DESC NULLS LAST), '[]'::jsonb)
  FROM (
    SELECT jsonb_build_object(
      'id', m.id, 'title', m.title, 'excerpt', m.excerpt, 'category', m.category,
      'difficulty', m.difficulty, 'word_count', m.word_count,
      'estimated_read_seconds', m.estimated_read_seconds, 'credits', m.credits,
      'url', m.url, 'published_at', m.published_at,
      'completed', EXISTS (SELECT 1 FROM public.reward_completions c
        WHERE c.mission_id = m.id AND c.user_id = auth.uid())
    ) AS row
    FROM public.reward_missions m
    WHERE m.status = 'approved'
  ) sub;
$$;

-- Full mission (server-side only): content + quiz. Increments read_count.
CREATE OR REPLACE FUNCTION public.reward_get_mission(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_m public.reward_missions;
BEGIN
  SELECT * INTO v_m FROM public.reward_missions WHERE id = p_id AND status = 'approved';
  IF NOT FOUND THEN RETURN NULL; END IF;
  UPDATE public.reward_missions SET read_count = read_count + 1 WHERE id = p_id;
  RETURN to_jsonb(v_m);
END; $$;

-- Cache a generated quiz on a mission
CREATE OR REPLACE FUNCTION public.reward_save_quiz(p_id uuid, p_quiz jsonb)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  UPDATE public.reward_missions SET quiz = p_quiz WHERE id = p_id;
$$;

-- Claim reward with reading validation, anti-fraud & daily limits
CREATE OR REPLACE FUNCTION public.reward_claim(
  p_mission_id uuid, p_total int, p_correct int, p_read_seconds int, p_scroll_percent int
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_s public.reward_settings;
  v_m public.reward_missions;
  v_today_credits int; v_today_missions int;
  v_ratio numeric; v_score int; v_award int; v_balance int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  SELECT * INTO v_s FROM public.reward_settings WHERE id = true;
  IF NOT COALESCE(v_s.enabled, false) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'disabled'); END IF;

  SELECT * INTO v_m FROM public.reward_missions WHERE id = p_mission_id AND status = 'approved';
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'mission_not_found'); END IF;

  IF EXISTS (SELECT 1 FROM public.reward_completions WHERE user_id = v_uid AND mission_id = p_mission_id) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_completed'); END IF;

  -- Reading validation
  IF p_scroll_percent < v_s.min_scroll_percent THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'insufficient_scroll'); END IF;
  IF p_read_seconds < FLOOR(v_m.estimated_read_seconds * 0.6) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'too_fast'); END IF;

  v_ratio := CASE WHEN p_total > 0 THEN p_correct::numeric / p_total ELSE 0 END;
  v_score := ROUND(v_ratio * 100);

  -- Low score: allow retry (no completion recorded)
  IF v_score < v_s.pass_threshold THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'low_score', 'score', v_score); END IF;

  -- Daily limits (only count rewarded missions)
  SELECT COALESCE(sum(credits_awarded), 0), count(*) INTO v_today_credits, v_today_missions
    FROM public.reward_completions
    WHERE user_id = v_uid AND created_at::date = now()::date;
  IF v_today_missions >= v_s.daily_mission_limit THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'daily_mission_limit'); END IF;

  v_award := ROUND(v_m.credits * v_ratio);
  IF v_award < 0 THEN v_award := 0; END IF;
  IF v_today_credits + v_award > v_s.daily_credit_limit THEN
    v_award := GREATEST(0, v_s.daily_credit_limit - v_today_credits); END IF;

  INSERT INTO public.reward_completions(
    user_id, mission_id, credits_awarded, score, total_questions, correct_answers, read_seconds, scroll_percent)
  VALUES (v_uid, p_mission_id, v_award, v_score, p_total, p_correct, p_read_seconds, p_scroll_percent);

  UPDATE public.reward_missions SET completion_count = completion_count + 1 WHERE id = p_mission_id;

  IF v_award > 0 THEN
    UPDATE public.profiles SET credits = credits + v_award, updated_at = now()
      WHERE id = v_uid RETURNING credits INTO v_balance;
    INSERT INTO public.credit_transactions(user_id, type, amount, balance_after, description)
    VALUES (v_uid, 'grant', v_award, v_balance,
      'Recompensa: leitura concluída - ' || left(v_m.title, 80));
  ELSE
    SELECT credits INTO v_balance FROM public.profiles WHERE id = v_uid;
  END IF;

  RETURN jsonb_build_object('ok', true, 'credits_awarded', v_award, 'score', v_score, 'balance', v_balance);
END; $$;

-- Upsert a mission (admin via authenticated, or service-role cron with null uid)
CREATE OR REPLACE FUNCTION public.reward_upsert_mission(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid(); v_id uuid; v_inserted boolean;
BEGIN
  IF v_uid IS NOT NULL AND NOT public.is_admin(v_uid) THEN RAISE EXCEPTION 'forbidden'; END IF;

  INSERT INTO public.reward_missions(
    source, url, external_id, title, excerpt, category, difficulty,
    word_count, estimated_read_seconds, credits, content, published_at, status)
  VALUES (
    COALESCE(p->>'source','official'),
    p->>'url',
    p->>'external_id',
    p->>'title',
    COALESCE(p->>'excerpt',''),
    COALESCE(p->>'category',''),
    COALESCE(p->>'difficulty','medio'),
    COALESCE((p->>'word_count')::int, 0),
    COALESCE((p->>'estimated_read_seconds')::int, 60),
    COALESCE((p->>'credits')::int, 2),
    COALESCE(p->>'content',''),
    NULLIF(p->>'published_at','')::timestamptz,
    COALESCE(p->>'status','approved'))
  ON CONFLICT (external_id) DO UPDATE SET
    title = EXCLUDED.title,
    excerpt = EXCLUDED.excerpt,
    category = EXCLUDED.category,
    difficulty = EXCLUDED.difficulty,
    word_count = EXCLUDED.word_count,
    estimated_read_seconds = EXCLUDED.estimated_read_seconds,
    credits = EXCLUDED.credits,
    content = EXCLUDED.content,
    url = EXCLUDED.url,
    updated_at = now()
  RETURNING id, (xmax = 0) INTO v_id, v_inserted;

  RETURN jsonb_build_object('id', v_id, 'inserted', v_inserted);
END; $$;

-- Admin: list every mission
CREATE OR REPLACE FUNCTION public.reward_admin_list_missions()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', m.id, 'title', m.title, 'category', m.category, 'difficulty', m.difficulty,
      'word_count', m.word_count, 'credits', m.credits, 'status', m.status,
      'source', m.source, 'url', m.url, 'read_count', m.read_count,
      'completion_count', m.completion_count, 'has_quiz', m.quiz IS NOT NULL,
      'published_at', m.published_at, 'created_at', m.created_at
    ) ORDER BY m.created_at DESC), '[]'::jsonb)
    FROM public.reward_missions m);
END; $$;

-- Admin: update settings (only provided keys)
CREATE OR REPLACE FUNCTION public.reward_admin_update_settings(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.reward_settings SET
    enabled = COALESCE((p->>'enabled')::boolean, enabled),
    content_source = COALESCE(p->>'content_source', content_source),
    blog_url = COALESCE(p->>'blog_url', blog_url),
    auto_approve = COALESCE((p->>'auto_approve')::boolean, auto_approve),
    credits_per_article = COALESCE((p->>'credits_per_article')::int, credits_per_article),
    daily_credit_limit = COALESCE((p->>'daily_credit_limit')::int, daily_credit_limit),
    daily_mission_limit = COALESCE((p->>'daily_mission_limit')::int, daily_mission_limit),
    min_scroll_percent = COALESCE((p->>'min_scroll_percent')::int, min_scroll_percent),
    seconds_per_100_words = COALESCE((p->>'seconds_per_100_words')::int, seconds_per_100_words),
    pass_threshold = COALESCE((p->>'pass_threshold')::int, pass_threshold),
    credits_by_difficulty = COALESCE(p->'credits_by_difficulty', credits_by_difficulty),
    credits_by_category = COALESCE(p->'credits_by_category', credits_by_category),
    eligible_categories = COALESCE(
      (SELECT array_agg(value::text) FROM jsonb_array_elements_text(p->'eligible_categories')),
      eligible_categories)
  WHERE id = true;
  RETURN jsonb_build_object('ok', true);
END; $$;

-- Admin: approve/reject mission
CREATE OR REPLACE FUNCTION public.reward_admin_set_status(p_id uuid, p_status text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_status NOT IN ('pending','approved','rejected') THEN RAISE EXCEPTION 'invalid_status'; END IF;
  UPDATE public.reward_missions SET status = p_status, updated_at = now() WHERE id = p_id;
  RETURN jsonb_build_object('ok', true);
END; $$;

-- Admin: stats
CREATE OR REPLACE FUNCTION public.reward_admin_stats()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN jsonb_build_object(
    'total_missions', (SELECT count(*) FROM public.reward_missions),
    'approved_missions', (SELECT count(*) FROM public.reward_missions WHERE status='approved'),
    'pending_missions', (SELECT count(*) FROM public.reward_missions WHERE status='pending'),
    'total_completions', (SELECT count(*) FROM public.reward_completions),
    'credits_distributed', (SELECT COALESCE(sum(credits_awarded),0) FROM public.reward_completions),
    'participants', (SELECT count(DISTINCT user_id) FROM public.reward_completions),
    'avg_score', (SELECT COALESCE(ROUND(avg(score)),0) FROM public.reward_completions),
    'avg_read_seconds', (SELECT COALESCE(ROUND(avg(read_seconds)),0) FROM public.reward_completions),
    'completion_rate', (
      SELECT CASE WHEN (SELECT count(*) FROM public.reward_missions WHERE status='approved') > 0
        THEN ROUND(100.0 * (SELECT count(*) FROM public.reward_completions)
          / NULLIF((SELECT sum(read_count) FROM public.reward_missions WHERE status='approved'),0))
        ELSE 0 END),
    'top_missions', (SELECT COALESCE(jsonb_agg(t),'[]'::jsonb) FROM (
        SELECT title, completion_count, read_count FROM public.reward_missions
        ORDER BY completion_count DESC, read_count DESC LIMIT 5) t),
    'top_users', (SELECT COALESCE(jsonb_agg(t),'[]'::jsonb) FROM (
        SELECT p.email, count(*) AS completions, COALESCE(sum(c.credits_awarded),0) AS credits
        FROM public.reward_completions c JOIN public.profiles p ON p.id = c.user_id
        GROUP BY p.email ORDER BY completions DESC LIMIT 5) t)
  );
END; $$;

-- Grants on functions
GRANT EXECUTE ON FUNCTION public.reward_config() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reward_list_missions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reward_get_mission(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reward_save_quiz(uuid, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reward_claim(uuid, int, int, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reward_upsert_mission(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reward_admin_list_missions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reward_admin_update_settings(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reward_admin_set_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reward_admin_stats() TO authenticated;
