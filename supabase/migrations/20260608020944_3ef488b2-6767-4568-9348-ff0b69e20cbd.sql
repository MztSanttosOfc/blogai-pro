-- Explicit deny-all policies for client roles (intent made explicit; server uses service_role which bypasses RLS).
CREATE POLICY "No client access to blogger connections"
  ON public.blogger_connections
  AS RESTRICTIVE
  FOR ALL
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);

CREATE POLICY "No client access to financial logs"
  ON public.financial_logs
  AS RESTRICTIVE
  FOR ALL
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);