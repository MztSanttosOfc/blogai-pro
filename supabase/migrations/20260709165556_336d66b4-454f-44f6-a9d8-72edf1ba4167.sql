CREATE TABLE public.seo_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cache_key TEXT NOT NULL,
  site_url TEXT,
  payload JSONB NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, cache_key)
);

GRANT ALL ON public.seo_cache TO service_role;

ALTER TABLE public.seo_cache ENABLE ROW LEVEL SECURITY;

-- No policies for anon/authenticated: this cache is written and read exclusively
-- by the server (service role) which bypasses RLS. Clients have no direct access.

CREATE INDEX seo_cache_expires_idx ON public.seo_cache (expires_at);

CREATE TRIGGER update_seo_cache_updated_at
  BEFORE UPDATE ON public.seo_cache
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();