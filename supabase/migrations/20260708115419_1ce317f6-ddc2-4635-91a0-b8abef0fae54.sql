-- Storage: the private `article-images` bucket is accessed ONLY by the
-- service-role admin client (uploads) and via long-lived signed URLs (reads).
-- No client (anon/authenticated) ever touches storage.objects directly.
CREATE POLICY "article_images_deny_anon"
  ON storage.objects
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (bucket_id <> 'article-images')
  WITH CHECK (bucket_id <> 'article-images');

CREATE POLICY "article_images_deny_authenticated"
  ON storage.objects
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (bucket_id <> 'article-images')
  WITH CHECK (bucket_id <> 'article-images');

-- reward_missions: deny all client writes (writes happen via service_role).
CREATE POLICY "reward_missions_no_client_insert"
  ON public.reward_missions AS RESTRICTIVE
  FOR INSERT TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY "reward_missions_no_client_update"
  ON public.reward_missions AS RESTRICTIVE
  FOR UPDATE TO anon, authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY "reward_missions_no_client_delete"
  ON public.reward_missions AS RESTRICTIVE
  FOR DELETE TO anon, authenticated
  USING (false);

-- reward_settings: clients may read config but never modify it.
CREATE POLICY "reward_settings_no_client_insert"
  ON public.reward_settings AS RESTRICTIVE
  FOR INSERT TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY "reward_settings_no_client_update"
  ON public.reward_settings AS RESTRICTIVE
  FOR UPDATE TO anon, authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY "reward_settings_no_client_delete"
  ON public.reward_settings AS RESTRICTIVE
  FOR DELETE TO anon, authenticated
  USING (false);