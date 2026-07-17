
CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  prefix text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  scopes text[] NOT NULL DEFAULT ARRAY['*']::text[],
  rate_limit_per_minute integer NOT NULL DEFAULT 60,
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS api_keys_user_idx ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS api_keys_hash_idx ON public.api_keys(key_hash);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "api_keys_owner_select" ON public.api_keys FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "api_keys_owner_insert" ON public.api_keys FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "api_keys_owner_update" ON public.api_keys FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "api_keys_owner_delete" ON public.api_keys FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_api_keys_updated_at BEFORE UPDATE ON public.api_keys FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.api_request_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  api_key_id uuid REFERENCES public.api_keys(id) ON DELETE SET NULL,
  auth_type text NOT NULL,
  method text NOT NULL,
  path text NOT NULL,
  status_code integer NOT NULL,
  error_code text,
  duration_ms integer,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS api_logs_user_idx    ON public.api_request_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS api_logs_key_idx     ON public.api_request_logs(api_key_id, created_at DESC);
CREATE INDEX IF NOT EXISTS api_logs_created_idx ON public.api_request_logs(created_at DESC);
GRANT SELECT ON public.api_request_logs TO authenticated;
GRANT ALL ON public.api_request_logs TO service_role;
ALTER TABLE public.api_request_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "api_logs_owner_select" ON public.api_request_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "api_logs_admin_select" ON public.api_request_logs FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.api_idempotency_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL,
  method text NOT NULL,
  path text NOT NULL,
  request_hash text NOT NULL,
  response_status integer NOT NULL,
  response_body jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  UNIQUE (user_id, idempotency_key, method, path)
);
CREATE INDEX IF NOT EXISTS api_idem_expires_idx ON public.api_idempotency_keys(expires_at);
GRANT ALL ON public.api_idempotency_keys TO service_role;
GRANT SELECT, INSERT ON public.api_idempotency_keys TO authenticated;
ALTER TABLE public.api_idempotency_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "api_idem_owner_select" ON public.api_idempotency_keys FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "api_idem_owner_insert" ON public.api_idempotency_keys FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.api_count_recent_requests(
  p_user_id uuid,
  p_api_key_id uuid,
  p_since timestamptz
)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int FROM public.api_request_logs
   WHERE created_at >= p_since
     AND (
       (p_api_key_id IS NOT NULL AND api_key_id = p_api_key_id)
       OR (p_api_key_id IS NULL AND user_id = p_user_id)
     );
$$;
GRANT EXECUTE ON FUNCTION public.api_count_recent_requests(uuid, uuid, timestamptz) TO authenticated, service_role;
