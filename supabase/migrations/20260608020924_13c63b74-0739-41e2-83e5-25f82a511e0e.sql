-- 1) blogger_connections: tokens OAuth nunca devem ser acessíveis por clientes.
DROP POLICY IF EXISTS "Users can view own blogger connection" ON public.blogger_connections;
DROP POLICY IF EXISTS "Users can insert own blogger connection" ON public.blogger_connections;
DROP POLICY IF EXISTS "Users can update own blogger connection" ON public.blogger_connections;
DROP POLICY IF EXISTS "Users can delete own blogger connection" ON public.blogger_connections;

REVOKE ALL ON public.blogger_connections FROM anon;
REVOKE ALL ON public.blogger_connections FROM authenticated;
GRANT ALL ON public.blogger_connections TO service_role;

ALTER TABLE public.blogger_connections ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.blogger_connections IS
  'Server-only. Stores Google OAuth access/refresh tokens. No client RLS policies by design — accessed exclusively via the service-role admin client. Do NOT add client-facing policies.';

-- 2) financial_logs: acesso exclusivo do servidor (sem policies de cliente, por design).
REVOKE ALL ON public.financial_logs FROM anon;
REVOKE ALL ON public.financial_logs FROM authenticated;
GRANT ALL ON public.financial_logs TO service_role;

ALTER TABLE public.financial_logs ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.financial_logs IS
  'Server-only audit log. RLS enabled with no client policies by design — accessed exclusively via the service-role admin client. Do NOT add client-facing policies.';