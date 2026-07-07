-- Extensions for scheduled execution
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- =========================================================
-- Scheduled posts (Agendamento de Publicações)
-- =========================================================
CREATE TABLE public.scheduled_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  blogger_post_url text,
  blogger_post_id text,
  error text,
  executed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_posts TO authenticated;
GRANT ALL ON public.scheduled_posts TO service_role;
ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own scheduled posts"
  ON public.scheduled_posts FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_scheduled_posts_due
  ON public.scheduled_posts (scheduled_at)
  WHERE status = 'pending';
CREATE INDEX idx_scheduled_posts_user ON public.scheduled_posts (user_id);

CREATE TRIGGER set_scheduled_posts_updated_at
  BEFORE UPDATE ON public.scheduled_posts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Execution logs for scheduled posts
CREATE TABLE public.scheduled_post_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_post_id uuid NOT NULL REFERENCES public.scheduled_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level text NOT NULL DEFAULT 'info',
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.scheduled_post_logs TO authenticated;
GRANT ALL ON public.scheduled_post_logs TO service_role;
ALTER TABLE public.scheduled_post_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own scheduled logs"
  ON public.scheduled_post_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_scheduled_logs_post ON public.scheduled_post_logs (scheduled_post_id);

-- =========================================================
-- Content clusters (Planejador de Clusters de Conteúdo)
-- =========================================================
CREATE TABLE public.content_clusters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic text NOT NULL,
  pillar jsonb NOT NULL DEFAULT '{}'::jsonb,
  satellites jsonb NOT NULL DEFAULT '[]'::jsonb,
  primary_keywords text[] NOT NULL DEFAULT '{}'::text[],
  secondary_keywords text[] NOT NULL DEFAULT '{}'::text[],
  internal_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  language text NOT NULL DEFAULT 'Português',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_clusters TO authenticated;
GRANT ALL ON public.content_clusters TO service_role;
ALTER TABLE public.content_clusters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own clusters"
  ON public.content_clusters FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_content_clusters_user ON public.content_clusters (user_id);

CREATE TRIGGER set_content_clusters_updated_at
  BEFORE UPDATE ON public.content_clusters
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();