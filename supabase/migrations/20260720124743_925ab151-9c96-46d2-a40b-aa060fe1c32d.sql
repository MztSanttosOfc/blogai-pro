-- Fix root cause of Onda 5 regressions:
-- RLS policies on user_roles and invite_redemptions call public.is_admin(auth.uid()).
-- authenticated must be allowed to EXECUTE is_admin()/has_role(), otherwise SELECT fails
-- with "permission denied for function is_admin" before permissive owner policies can pass.

REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Keep sensitive Onda 5 tables private from anonymous/public direct Data API access.
REVOKE ALL ON public.user_roles FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.invite_codes FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.invite_redemptions FROM PUBLIC, anon, authenticated;

-- Authenticated users need direct reads only; writes are performed by gated SECURITY DEFINER RPCs.
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.invite_codes TO authenticated;
GRANT SELECT ON public.invite_redemptions TO authenticated;

-- Internal service role retains full backend access.
GRANT ALL ON public.user_roles TO service_role;
GRANT ALL ON public.invite_codes TO service_role;
GRANT ALL ON public.invite_redemptions TO service_role;

COMMENT ON FUNCTION public.is_admin(uuid) IS
  'SECURITY DEFINER RLS helper for admin checks. PUBLIC/anon revoked; authenticated needs EXECUTE because user_roles, invite_redemptions and admin policies evaluate it during normal authenticated reads.';
COMMENT ON FUNCTION public.has_role(uuid, public.app_role) IS
  'SECURITY DEFINER RLS helper for role checks. PUBLIC/anon revoked; authenticated and service_role may execute for server-side and policy-backed role checks.';