
-- Documenta intencionalidade do deny-all e reforça a postura de segurança.
-- Ambas as tabelas são server-side only, acessadas exclusivamente via service_role
-- (supabaseAdmin) em src/lib/seo-performance.server.ts. O cliente autenticado
-- (anon/authenticated) NUNCA deve ler/escrever diretamente. RLS habilitado sem
-- policies = deny-all é o comportamento correto e intencional (defense in depth).

REVOKE ALL ON public.seo_cache FROM anon, authenticated;
REVOKE ALL ON public.seo_property_map FROM anon, authenticated;

GRANT ALL ON public.seo_cache TO service_role;
GRANT ALL ON public.seo_property_map TO service_role;

ALTER TABLE public.seo_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_property_map ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.seo_cache IS
  'Server-side only. Cache de respostas do Google Search Console (TTL 3h). Acesso exclusivo via service_role em src/lib/seo-performance.server.ts (readSeoCache/writeSeoCache/clearSeoCacheForUser). Nenhum código cliente/authenticated toca esta tabela. RLS habilitado SEM policies (deny-all) é intencional: o token do GSC e o payload cacheado nunca devem ser expostos ao cliente; a UI recebe apenas o resultado processado via server function getSeoPerformance. Falso positivo do linter (rls_enabled_no_policy).';

COMMENT ON TABLE public.seo_property_map IS
  'Server-side only. Mapeamento persistente Usuário → Blog do Blogger → Propriedade do Search Console (verificação, permission_level, matched_by). Acesso exclusivo via service_role em src/lib/seo-performance.server.ts (readPropertyMap/syncPropertyMap) e no endpoint REST /api/v1/seo/status (executado no servidor, dentro de withAuth). Nenhum acesso direto do cliente. RLS habilitado SEM policies (deny-all) é intencional (defense in depth): a descoberta e o matching são responsabilidade do servidor, que já filtra por userId autenticado antes de consultar. Falso positivo do linter (rls_enabled_no_policy).';
