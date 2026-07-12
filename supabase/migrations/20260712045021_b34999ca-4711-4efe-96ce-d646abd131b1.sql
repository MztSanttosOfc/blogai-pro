CREATE TABLE public.seo_property_map (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  blog_id TEXT NOT NULL,
  blog_url TEXT NOT NULL,
  site_url TEXT,
  permission_level TEXT,
  verified BOOLEAN NOT NULL DEFAULT false,
  matched_by TEXT,
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, blog_id)
);

GRANT ALL ON public.seo_property_map TO service_role;

ALTER TABLE public.seo_property_map ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_seo_property_map_updated_at
  BEFORE UPDATE ON public.seo_property_map
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();