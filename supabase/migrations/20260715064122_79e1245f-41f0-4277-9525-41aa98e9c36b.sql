
-- Audit: lock down SECURITY DEFINER functions.
-- Strategy: revoke EXECUTE from PUBLIC/anon on every SECURITY DEFINER function,
-- then re-grant EXECUTE to authenticated ONLY on the ones actually invoked
-- from user contexts (via .rpc() using the authenticated Supabase client).
-- All privileged actions inside these functions self-check is_admin().
-- Trigger functions and service-role-only functions get no authenticated grant.

-- 1) Revoke from PUBLIC (default) and anon on all SECURITY DEFINER functions.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC', r.proname, r.args);
    EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM anon', r.proname, r.args);
    EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM authenticated', r.proname, r.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO service_role', r.proname, r.args);
  END LOOP;
END $$;

-- 2) Re-grant EXECUTE to authenticated for user-facing RPCs only.
-- Rewards (end-users):
GRANT EXECUTE ON FUNCTION public.reward_config() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reward_list_missions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reward_get_mission(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reward_claim(uuid, integer, integer, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reward_save_quiz(uuid, jsonb) TO authenticated;

-- Admin RPCs (self-gated with is_admin() inside):
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_plan(uuid, user_plan) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_credits(uuid, text, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_audit_logs(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reward_admin_list_missions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reward_admin_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reward_admin_update_settings(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reward_admin_set_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reward_upsert_mission(jsonb) TO authenticated;

-- 3) Document intent for auditors (comments explain why each remaining SECDEF exists).
COMMENT ON FUNCTION public.is_admin(uuid) IS
  'SECURITY DEFINER: used inside RLS policies to bypass recursive user_roles reads. Only callable by service_role and nested SECDEF functions.';
COMMENT ON FUNCTION public.has_role(uuid, app_role) IS
  'SECURITY DEFINER: RLS helper. Locked down to service_role.';
COMMENT ON FUNCTION public.handle_new_user() IS
  'SECURITY DEFINER: auth.users trigger that seeds profile/subscription/credits. Not user-callable.';
COMMENT ON FUNCTION public.activate_payment(uuid, text) IS
  'SECURITY DEFINER: called only by SyncPay webhook via service_role.';
COMMENT ON FUNCTION public.handle_updated_at() IS 'Trigger function.';
COMMENT ON FUNCTION public.update_updated_at_column() IS 'Trigger function.';
