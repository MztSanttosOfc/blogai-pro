
-- Monetization settings (singleton)
CREATE TABLE public.monetization_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  ads_enabled boolean NOT NULL DEFAULT false,
  free_only boolean NOT NULL DEFAULT true,
  publisher_id text NOT NULL DEFAULT 'ca-pub-7734451387580533',
  meta_tag text NOT NULL DEFAULT '<meta name="google-adsense-account" content="ca-pub-7734451387580533">',
  script_snippet text NOT NULL DEFAULT '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7734451387580533" crossorigin="anonymous"></script>',
  ads_txt text NOT NULL DEFAULT 'google.com, pub-7734451387580533, DIRECT, f08c47fec0942fa0',
  disabled_pages text[] NOT NULL DEFAULT ARRAY[]::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.monetization_settings TO authenticated;
GRANT ALL ON public.monetization_settings TO service_role;

ALTER TABLE public.monetization_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "monetization_settings_owner_select"
  ON public.monetization_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "monetization_settings_owner_insert"
  ON public.monetization_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "monetization_settings_owner_update"
  ON public.monetization_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'owner'));

INSERT INTO public.monetization_settings (id) VALUES (true) ON CONFLICT DO NOTHING;

CREATE TRIGGER trg_monetization_settings_updated_at
  BEFORE UPDATE ON public.monetization_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Ad slots registry
CREATE TABLE public.ad_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  position text NOT NULL,
  slot_code text,
  kind text NOT NULL DEFAULT 'display',
  format text NOT NULL DEFAULT 'auto',
  active boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_slots TO authenticated;
GRANT ALL ON public.ad_slots TO service_role;

ALTER TABLE public.ad_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ad_slots_owner_all"
  ON public.ad_slots FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'owner'));

CREATE TRIGGER trg_ad_slots_updated_at
  BEFORE UPDATE ON public.ad_slots
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Seed common positions (inactive until Owner adds slot codes)
INSERT INTO public.ad_slots (name, position, kind, format, active) VALUES
  ('Banner Topo', 'top', 'banner', 'horizontal', false),
  ('Banner Rodapé', 'footer', 'banner', 'horizontal', false),
  ('Banner Sidebar', 'sidebar', 'display', 'vertical', false),
  ('In-Feed', 'in-feed', 'in-feed', 'fluid', false),
  ('Multiplex', 'multiplex', 'multiplex', 'autorelaxed', false),
  ('Entre Artigos', 'between-articles', 'display', 'auto', false),
  ('Dashboard', 'dashboard', 'display', 'auto', false),
  ('Biblioteca', 'library', 'display', 'auto', false);
