# BlogAI Pro — Decisões de Segurança

Documento de referência para auditores. Registra **por que** cada decisão de segurança foi tomada durante o desenvolvimento do BlogAI Pro (v1.0 → v1.2 + Onda 5). Todas as decisões aqui listadas foram revisadas contra o Supabase Security Scanner e o linter oficial.

Última revisão: 2026-07-20
Responsável técnico: Júnnior Monzart

---

## 1. Modelo de Acesso Geral

O BlogAI Pro é um SaaS multi-tenant onde cada usuário só pode acessar seus próprios dados. Papéis administrativos (`owner`, `admin`) são armazenados exclusivamente em `public.user_roles` (nunca em `profiles`) para evitar escalonamento de privilégios via UPDATE direto no perfil.

Camadas de defesa:
1. **RLS** em toda tabela do schema `public` acessível pelo cliente.
2. **GRANTs explícitos** por role (`anon`, `authenticated`, `service_role`) — nunca dependemos de default privileges.
3. **`SECURITY DEFINER` + `search_path = public`** em toda função sensível.
4. **service_role isolado no servidor** — nunca embarcado no bundle do cliente.

---

## 2. Funções `SECURITY DEFINER` Auditadas

Todas as funções abaixo usam `SET search_path = public` para evitar *search path hijacking* (CVE-2018-1058). `EXECUTE` é concedido apenas a `authenticated` (ou `service_role` quando estritamente interno).

### 2.1 Suporte a RLS (críticas)

| Função | Motivo | GRANT EXECUTE |
|---|---|---|
| `has_role(uuid, app_role)` | Base para todas as políticas de admin. Precisa `DEFINER` para ler `user_roles` sem trigger recursivo de RLS. | `authenticated` |
| `is_admin(uuid)` | Atalho para `has_role in ('owner','admin')`. Usada em ~15 policies e RPCs. | `authenticated` |

> ⚠️ Regressão histórica (Onda 5): revogar `EXECUTE` dessas funções para `authenticated` quebra silenciosamente o menu Admin e a tela Indique e Ganhe (`permission denied for function is_admin`). **Nunca revogar.**

### 2.2 Admin / Auditoria

| Função | Motivo |
|---|---|
| `admin_stats`, `admin_list_users`, `admin_list_audit_logs`, `admin_feedback_stats`, `analytics_user_overview` | Precisam agregar dados cross-user (`profiles`, `payments`, `user_activity_logs`). Cada função valida `is_admin(auth.uid())` no início e falha com `forbidden`. |
| `admin_set_plan`, `admin_adjust_credits` | Mutações privilegiadas. Escrevem em `admin_audit_logs` para trilha imutável. |

### 2.3 Fluxo Financeiro

| Função | Motivo |
|---|---|
| `activate_payment` | Chamada pelos webhooks Stripe/SyncPay (server-side). Precisa atualizar `payments`, `subscriptions`, `profiles.credits` e `credit_transactions` numa única transação atômica. |
| `handle_new_user` | Trigger em `auth.users`. Cria `profiles`, `subscriptions` inicial e concede 10 créditos de boas-vindas. |

### 2.4 Recompensas & Convites

| Função | Motivo |
|---|---|
| `reward_claim`, `reward_config`, `reward_list_missions`, `reward_get_mission`, `reward_upsert_mission`, `reward_admin_*` | Precisam ler `reward_settings` (deny-all para authenticated) e escrever em `reward_completions`, `credit_transactions`. Validação de limite diário, score mínimo e anti-fraude (`min_scroll_percent`, `too_fast`) só é confiável server-side. |
| `invite_redeem`, `invite_qualify_and_reward`, `ensure_invite_code`, `_generate_invite_code` | Recompensa de 30 créditos é lançada pelo servidor após qualificação; permitir mutação direta abriria brecha de auto-referência. `_generate_invite_code` é `DEFINER` mas não `EXECUTE` público — chamada apenas por `ensure_invite_code`. |

### 2.5 Utilidades

| Função | Motivo |
|---|---|
| `handle_updated_at`, `update_updated_at_column` | Triggers `BEFORE UPDATE` para manter `updated_at`. `DEFINER` para funcionar em tabelas com RLS restritiva. |
| `log_user_activity` | Insere em `user_activity_logs`. Valida `auth.uid() = _user_id OR is_admin(auth.uid())`. |
| `api_count_recent_requests` | Consulta o próprio log para rate-limiting da API REST v1. |

---

## 3. Tabelas Server-Only (RLS habilitado, zero policies = deny-all)

Estas tabelas têm RLS **habilitado** mas **nenhuma policy** — deny-all para `anon` e `authenticated` por design. Todo acesso ocorre via `supabaseAdmin` (service_role) em módulos `*.server.ts`. O Security Scanner reporta warning "RLS enabled with no policies"; este comportamento é **intencional** e está documentado via `COMMENT ON TABLE`.

| Tabela | Módulo consumidor | Motivo |
|---|---|---|
| `seo_cache` | `src/lib/seo-performance.server.ts` | Cache bruto da Google Search Console API (TTL 3h). Contém métricas agregadas por propriedade. Expor ao cliente permitiria enumeração de propriedades verificadas de outros usuários. |
| `seo_property_map` | `src/lib/seo-performance.server.ts` | Mapeamento `user_id → blogger_id → gsc_property`. Necessário para o matching universal (normalização de domínios + `registrableDomain`). Acesso client-side vazaria a topologia GSC de terceiros. |
| `blogger_connections` | `src/lib/blogger.server.ts` | Armazena `refresh_token` OAuth do Google. Segredo. Nunca deve chegar ao cliente sob nenhuma hipótese — nem para leitura, nem via SELECT parcial. |

### Por que não usar policies "user_id = auth.uid()"?

- **`blogger_connections`**: mesmo filtrada por usuário, uma policy `SELECT` exporia colunas sensíveis (`refresh_token`, `access_token`) ao bundle do cliente via inferência de tipos e a queries acidentais. Deny-all elimina a superfície.
- **`seo_cache` / `seo_property_map`**: são *implementation details* do módulo SEO. Clientes leem apenas o resultado processado via `createServerFn`, nunca a tabela crua. Adicionar policies criaria uma API pública não documentada.

**Defense in depth**: mesmo que um bug futuro exponha um cliente Supabase com a chave publishable a essas tabelas, o deny-all garante `0 rows`.

---

## 4. Arquitetura de Pagamentos — Stripe + SyncPay

Dois gateways coexistem, isolados por moeda:

| Gateway | Moeda | Cliente | Webhook |
|---|---|---|---|
| **SyncPay** | BRL | `src/lib/syncpay.server.ts` | `src/routes/api/public/webhooks/syncpay.ts` |
| **Stripe** | USD | `src/lib/stripe.server.ts` | `src/routes/api/public/webhooks/stripe.ts` |

Roteamento via `GatewayManager` (`src/lib/gateway.server.ts`) baseado em `currency`. Auto-detecção por geolocalização (fallback BRL).

### Decisões de segurança:

1. **Secrets isolados**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SYNCPAY_CLIENT_SECRET` acessados **apenas** via `process.env` dentro de `.handler()` de `createServerFn` ou route handlers em `src/routes/api/public/webhooks/*`. Nunca em `import.meta.env`, nunca no bundle do cliente.
2. **Verificação HMAC obrigatória**: webhooks validam assinatura antes de parsear payload. `timingSafeEqual` para comparação (evita timing attacks).
3. **Endpoints públicos em `/api/public/*`**: prefixo bypassa auth por design (Stripe/SyncPay não têm bearer). Segurança vem 100% da assinatura HMAC.
4. **Atomicidade**: webhooks chamam `activate_payment(payment_id, external_id)` — RPC transacional que atualiza `payments`, `subscriptions`, `profiles.credits`, `credit_transactions` e `financial_logs` num único statement.
5. **Idempotência**: `payments.external_id` é UNIQUE; retries do Stripe/SyncPay não duplicam créditos porque `activate_payment` retorna `already_paid` no segundo call.

---

## 5. Uso de `service_role`

`SUPABASE_SERVICE_ROLE_KEY` bypassa RLS. Regras absolutas:

- **Nunca** importar `@/integrations/supabase/client.server` no top-level de arquivos que fazem parte do grafo do cliente (`*.functions.ts`, arquivos de rota). Só em `*.server.ts`, ou via `await import(...)` dentro do `.handler()`.
- **Nunca** usar como cliente padrão para leituras públicas — usar server publishable client com `TO anon SELECT` policy explícita.
- **Sempre** autorizar o chamador antes de instanciar. Padrão canônico:

```ts
.middleware([requireSupabaseAuth])
.handler(async ({ context }) => {
  const { data: isAdmin } = await context.supabase
    .rpc('has_role', { _user_id: context.userId, _role: 'admin' })
  if (!isAdmin) throw new Error('Forbidden')
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  // ...
})
```

Nota: **nunca** usar `supabaseAdmin` para *verificar* se o chamador é admin — isso bypassa RLS e cria escalonamento trivial. A verificação usa `context.supabase` (RLS como o próprio usuário).

Casos de uso legítimos do `service_role` no BlogAI Pro:
- Webhooks de pagamento (não há usuário autenticado).
- Escrita em tabelas server-only (`seo_cache`, `blogger_connections`).
- Operações administrativas privilegiadas (após checagem `is_admin`).

---

## 6. `createServerFn` — Padrão de RPC

Toda lógica app-internal usa `createServerFn` de `@tanstack/react-start`, não Supabase Edge Functions.

Regras aplicadas:

1. **Middleware de auth**: `requireSupabaseAuth` em toda função que toca dados de usuário. Popula `context.supabase` (RLS-scoped), `context.userId`, `context.claims`.
2. **`inputValidator` com Zod**: validação estrita antes do handler. Rejeita payloads malformados com erro tipado.
3. **`process.env` só dentro de `.handler()`**: leitura no top-level retorna `undefined` (injeção acontece em call time).
4. **Nunca chamar server functions protegidas em loaders de rotas públicas**: SSR/prerender não tem bearer e o build quebra com `Unauthorized`. Protegidas só em componentes (via `useServerFn` + `useQuery`) ou em loaders sob `_authenticated/`.
5. **Endpoints externos usam `createFileRoute` sob `/api/public/*`**, não `createServerFn` (que é RPC tipado, não HTTP público).

---

## 7. Warnings do Security Scanner — Justificativas

### 7.1 "RLS enabled with no policies" — `seo_cache`, `seo_property_map`, `blogger_connections`
**Status**: Ignorado (falso positivo).
**Motivo**: Ver Seção 3. Deny-all é intencional; acesso 100% via `service_role` server-side.
**Documentado em**: `COMMENT ON TABLE` de cada uma.

### 7.2 "Function Search Path Mutable"
**Status**: Resolvido.
**Ação**: Todas as funções `SECURITY DEFINER` recriadas com `SET search_path = public`. Auditado em Onda 5.

### 7.3 "Extension in Public Schema"
**Status**: Aceito.
**Motivo**: `pgcrypto` (`gen_random_uuid`) e `pgjwt` são pré-instaladas pelo Supabase no schema `public`. Movê-las quebra migrações históricas. Risco residual: nulo (funções da extensão não colidem com nossos identifiers).

### 7.4 "Leaked Password Protection Disabled"
**Status**: Configuração do projeto (fora do escopo do código).
**Motivo**: A checagem HIBP está habilitada no dashboard Auth quando aplicável. Não é gerenciável via migração.

### 7.5 "Auth OTP Long Expiry"
**Status**: Aceito.
**Motivo**: OTP de 1h é o padrão UX para email magic link em PT-BR (usuários frequentemente demoram a abrir email em mobile). Compensado por rate limit de tentativas e bloqueio após 5 falhas.

### 7.6 Endpoints `/api/public/*` sem auth
**Status**: Falso positivo.
**Motivo**: Design intencional (webhooks Stripe/SyncPay). Segurança via HMAC + `timingSafeEqual`. Ver Seção 4.

---

## 8. Trilhas de Auditoria

Toda ação sensível é logada:

| Tabela | Conteúdo |
|---|---|
| `admin_audit_logs` | Toda mudança de plano, ajuste de crédito, alteração de role. Imutável (nenhuma policy DELETE). |
| `financial_logs` | Eventos de pagamento (webhook received, activated, failed). |
| `credit_transactions` | Todo delta de crédito com `balance_after` e descrição. |
| `user_activity_logs` | Timeline de atividade do usuário (login, geração, publicação). Filtrado por `auth.uid()` ou admin. |
| `api_request_logs` | Toda chamada à API REST v1, com `api_key_id`, latência, status. |
| `scheduled_post_logs` | Execução do scheduler de publicações. |

---

## 9. Conta Owner

`junnior.monzart.santtos1997@gmail.com`:
- `user_roles`: `owner` + `admin`
- `profiles.plan`: `premium` permanente (subscription até 2126)
- `profiles.credits`: 999.999 (renovado se cair)
- Toda restauração é registrada em `admin_audit_logs` com `action = 'owner.restore'`.

---

## 10. Checklist para Futuros Auditores

- [ ] Toda tabela `public.*` acessível pelo cliente tem RLS habilitado **e** ao menos uma policy?
- [ ] Toda tabela server-only tem RLS enabled + deny-all + `COMMENT ON TABLE` documentando?
- [ ] Toda função `SECURITY DEFINER` tem `SET search_path = public`?
- [ ] `is_admin` e `has_role` têm `GRANT EXECUTE TO authenticated`?
- [ ] Nenhum `*.functions.ts` ou arquivo de rota importa `client.server` no top-level?
- [ ] Todo webhook em `/api/public/*` valida assinatura HMAC antes de parsear?
- [ ] Roles armazenadas apenas em `user_roles` (nunca em `profiles`)?
- [ ] Verificação de admin usa `context.supabase.rpc('has_role')`, nunca `supabaseAdmin`?

Se todos os itens acima passam, o modelo de segurança do BlogAI Pro está íntegro.
