-- Blogger connections (tokens are server-only; accessed via service role)
CREATE TABLE public.blogger_connections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  google_email text,
  access_token text NOT NULL,
  refresh_token text,
  token_expires_at timestamp with time zone,
  selected_blog_id text,
  selected_blog_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Server-only access. No policies for authenticated => browser cannot read tokens.
GRANT ALL ON public.blogger_connections TO service_role;
ALTER TABLE public.blogger_connections ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_blogger_connections_updated_at
  BEFORE UPDATE ON public.blogger_connections
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Track the published Blogger post on each article
ALTER TABLE public.articles
  ADD COLUMN blogger_post_id text,
  ADD COLUMN blogger_post_url text;