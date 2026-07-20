-- 1) Feedback table
CREATE TABLE public.user_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  suggestion text,
  issue text,
  admin_reply text,
  admin_reply_at timestamptz,
  admin_reply_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_feedback TO authenticated;
GRANT ALL ON public.user_feedback TO service_role;

ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own feedback"
  ON public.user_feedback
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all feedback"
  ON public.user_feedback
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can reply to feedback"
  ON public.user_feedback
  FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER user_feedback_updated_at
  BEFORE UPDATE ON public.user_feedback
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_user_feedback_created_at ON public.user_feedback (created_at DESC);
CREATE INDEX idx_user_feedback_rating ON public.user_feedback (rating);

-- 2) Multi-currency support
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_currency text NOT NULL DEFAULT 'BRL'
  CHECK (preferred_currency IN ('BRL','USD'));

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'BRL'
  CHECK (currency IN ('BRL','USD'));

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS price_usd_cents integer;

-- 3) Admin aggregate helper (SECURITY DEFINER, admin-only)
CREATE OR REPLACE FUNCTION public.admin_feedback_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN jsonb_build_object(
    'total', (SELECT count(*) FROM public.user_feedback),
    'average', COALESCE((SELECT ROUND(avg(rating)::numeric, 2) FROM public.user_feedback), 0),
    'by_rating', (
      SELECT COALESCE(jsonb_object_agg(rating, cnt), '{}'::jsonb)
      FROM (SELECT rating, count(*) AS cnt FROM public.user_feedback GROUP BY rating) s
    ),
    'with_suggestion', (SELECT count(*) FROM public.user_feedback WHERE suggestion IS NOT NULL AND length(trim(suggestion)) > 0),
    'with_issue', (SELECT count(*) FROM public.user_feedback WHERE issue IS NOT NULL AND length(trim(issue)) > 0),
    'recent_7d', (SELECT count(*) FROM public.user_feedback WHERE created_at > now() - interval '7 days')
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_feedback_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_feedback_stats() TO authenticated;

COMMENT ON FUNCTION public.admin_feedback_stats() IS 'Retorna estatísticas agregadas de feedback. Interno checa is_admin(auth.uid()) antes de retornar dados.';