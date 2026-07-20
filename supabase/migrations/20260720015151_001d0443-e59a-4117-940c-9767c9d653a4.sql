
-- Wave 1: Locale on profiles + Smart Profile table (v1.1)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'pt-BR';

CREATE TABLE IF NOT EXISTS public.user_smart_profile (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  personal jsonb NOT NULL DEFAULT '{}'::jsonb,
  contacts jsonb NOT NULL DEFAULT '{}'::jsonb,
  social_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  blogger jsonb NOT NULL DEFAULT '{}'::jsonb,
  seo_prefs jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_prefs jsonb NOT NULL DEFAULT '{}'::jsonb,
  default_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  signature text,
  feature_flags jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_smart_profile TO authenticated;
GRANT ALL ON public.user_smart_profile TO service_role;

ALTER TABLE public.user_smart_profile ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own smart profile" ON public.user_smart_profile;
CREATE POLICY "Users manage own smart profile"
  ON public.user_smart_profile
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_user_smart_profile_updated_at ON public.user_smart_profile;
CREATE TRIGGER trg_user_smart_profile_updated_at
  BEFORE UPDATE ON public.user_smart_profile
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
