-- Restrict admin RPCs to authenticated only (internal is_admin check still applies)
REVOKE EXECUTE ON FUNCTION public.admin_list_users() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_stats() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_set_plan(uuid, public.user_plan) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_adjust_credits(uuid, text, integer, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_list_audit_logs(integer) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_plan(uuid, public.user_plan) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_credits(uuid, text, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_audit_logs(integer) TO authenticated;

-- Role-check helpers: used by RLS policies; keep available to authenticated, block anon
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;