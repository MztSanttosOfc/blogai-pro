
-- 1) SECURITY FIX: reward_save_quiz não validava admin. Qualquer usuário
--    autenticado podia sobrescrever o quiz de qualquer missão. Adiciona guarda.
CREATE OR REPLACE FUNCTION public.reward_save_quiz(p_id uuid, p_quiz jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.reward_missions SET quiz = p_quiz WHERE id = p_id;
END;
$function$;

-- 2) Hardening de EXECUTE: revoga PUBLIC/anon e concede às roles necessárias.

-- Funções admin: só authenticated (guardadas por is_admin) + service_role.
REVOKE ALL ON FUNCTION public.admin_list_users()                             FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_stats()                                  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_plan(uuid, user_plan)                FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_adjust_credits(uuid, text, integer, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_audit_logs(integer)                 FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reward_admin_list_missions()                   FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reward_admin_set_status(uuid, text)            FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reward_admin_stats()                           FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reward_admin_update_settings(jsonb)            FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reward_save_quiz(uuid, jsonb)                  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reward_upsert_mission(jsonb)                   FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_list_users()                              TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_stats()                                   TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_plan(uuid, user_plan)                 TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_adjust_credits(uuid, text, integer, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_audit_logs(integer)                  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reward_admin_list_missions()                    TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reward_admin_set_status(uuid, text)             TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reward_admin_stats()                            TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reward_admin_update_settings(jsonb)             TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reward_save_quiz(uuid, jsonb)                   TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reward_upsert_mission(jsonb)                    TO authenticated, service_role;

-- Funções voltadas para qualquer usuário autenticado (validam auth.uid() internamente).
REVOKE ALL ON FUNCTION public.reward_config()                                                        FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reward_list_missions()                                                 FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reward_get_mission(uuid)                                               FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reward_claim(uuid, integer, integer, integer, integer)                 FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.reward_config()                                                      TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reward_list_missions()                                               TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reward_get_mission(uuid)                                             TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reward_claim(uuid, integer, integer, integer, integer)               TO authenticated, service_role;

-- Helpers usados em políticas RLS e dentro de outras SECURITY DEFINER: só backend.
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_admin(uuid)           FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid)           TO service_role;

-- Backend-only: webhooks/triggers, jamais chamadas por usuário.
REVOKE ALL ON FUNCTION public.activate_payment(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user()            FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_payment(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user()            TO service_role;

-- Utilitário interno: sem exposição pública.
REVOKE ALL ON FUNCTION public.api_count_recent_requests(uuid, uuid, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.api_count_recent_requests(uuid, uuid, timestamptz) TO authenticated, service_role;

-- Triggers/util genéricos.
REVOKE ALL ON FUNCTION public.handle_updated_at()      FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- Documentação técnica das funções SECURITY DEFINER mantidas.
COMMENT ON FUNCTION public.is_admin(uuid) IS
  'SECURITY DEFINER obrigatório: consulta user_roles ignorando RLS para evitar recursão nas policies. EXECUTE restrito a service_role; usada indiretamente por outras SECURITY DEFINER.';
COMMENT ON FUNCTION public.has_role(uuid, app_role) IS
  'SECURITY DEFINER obrigatório pelo mesmo motivo de is_admin. EXECUTE restrito a service_role.';
COMMENT ON FUNCTION public.handle_new_user() IS
  'Trigger em auth.users. SECURITY DEFINER necessário para popular profiles/subscriptions/credit_transactions. EXECUTE restrito a service_role.';
COMMENT ON FUNCTION public.activate_payment(uuid, text) IS
  'Ativação de pagamento via webhook. SECURITY DEFINER para atualizar profiles/subscriptions. Chamada apenas pelo backend; EXECUTE restrito a service_role.';
COMMENT ON FUNCTION public.admin_list_users() IS
  'Admin. SECURITY DEFINER para ler auth.users + tabelas com RLS. Guarda interna: is_admin(auth.uid()) => forbidden.';
COMMENT ON FUNCTION public.admin_stats() IS
  'Admin. SECURITY DEFINER. Guarda interna: is_admin(auth.uid()).';
COMMENT ON FUNCTION public.admin_set_plan(uuid, user_plan) IS
  'Admin. SECURITY DEFINER. Guarda interna: is_admin(auth.uid()). Registra em admin_audit_logs.';
COMMENT ON FUNCTION public.admin_adjust_credits(uuid, text, integer, text) IS
  'Admin. SECURITY DEFINER. Guarda interna: is_admin(auth.uid()). Registra em admin_audit_logs.';
COMMENT ON FUNCTION public.admin_list_audit_logs(integer) IS
  'Admin. SECURITY DEFINER. Guarda interna: is_admin(auth.uid()).';
COMMENT ON FUNCTION public.reward_admin_list_missions() IS
  'Admin. SECURITY DEFINER. Guarda interna: is_admin(auth.uid()).';
COMMENT ON FUNCTION public.reward_admin_set_status(uuid, text) IS
  'Admin. SECURITY DEFINER. Guarda interna: is_admin(auth.uid()).';
COMMENT ON FUNCTION public.reward_admin_stats() IS
  'Admin. SECURITY DEFINER. Guarda interna: is_admin(auth.uid()).';
COMMENT ON FUNCTION public.reward_admin_update_settings(jsonb) IS
  'Admin. SECURITY DEFINER. Guarda interna: is_admin(auth.uid()).';
COMMENT ON FUNCTION public.reward_save_quiz(uuid, jsonb) IS
  'Admin. SECURITY DEFINER. Guarda interna adicionada nesta migration: is_admin(auth.uid()).';
COMMENT ON FUNCTION public.reward_upsert_mission(jsonb) IS
  'Admin/seed. SECURITY DEFINER. Guarda interna: is_admin(auth.uid()) quando chamada por usuário; service_role pode chamar em jobs.';
COMMENT ON FUNCTION public.reward_claim(uuid, integer, integer, integer, integer) IS
  'Usuário final. SECURITY DEFINER para creditar profiles/credit_transactions sob validação. Escopo travado por auth.uid(); limites diários e anti-fraude aplicados internamente.';
COMMENT ON FUNCTION public.reward_config() IS
  'Usuário final. SECURITY DEFINER para ler reward_settings sem expor a tabela. Retorna somente configuração pública + estatísticas do próprio auth.uid().';
COMMENT ON FUNCTION public.reward_list_missions() IS
  'Usuário final. SECURITY DEFINER para filtrar apenas missões approved e marcar as já concluídas pelo próprio auth.uid().';
COMMENT ON FUNCTION public.reward_get_mission(uuid) IS
  'Usuário final. SECURITY DEFINER para servir apenas missões approved e incrementar contador de leitura.';
COMMENT ON FUNCTION public.api_count_recent_requests(uuid, uuid, timestamptz) IS
  'Rate-limit interno. SECURITY DEFINER para contar api_request_logs sem RLS. EXECUTE restrito a authenticated/service_role.';
