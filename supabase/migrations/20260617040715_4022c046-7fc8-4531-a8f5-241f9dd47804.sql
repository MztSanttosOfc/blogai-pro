
REVOKE EXECUTE ON FUNCTION public.reward_config() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reward_list_missions() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reward_get_mission(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reward_save_quiz(uuid, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reward_claim(uuid, int, int, int, int) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reward_upsert_mission(jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reward_admin_list_missions() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reward_admin_update_settings(jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reward_admin_set_status(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reward_admin_stats() FROM PUBLIC, anon;
