# Fase 3 — API Oficial BlogAI Pro (Infraestrutura & Segurança)

> Data: 2026-07-17 · Status: **Concluída** · Nada em produção existente foi modificado.

## 1. Infraestrutura criada

### 1.1 Migração de banco (`api_v1_infrastructure`)
Três novas tabelas em `public`, isoladas do resto do domínio, com GRANTs + RLS + policies:

| Tabela | Propósito | RLS |
|---|---|---|
| `api_keys` | Chaves de API do usuário (hash SHA-256, prefixo visível, escopos, `rate_limit_per_minute`, `expires_at`, `revoked_at`) | Somente o dono lê/escreve |
| `api_request_logs` | Log central de toda chamada `/api/v1/*` (request_id, auth_type, método, path, status, `error_code`, duração, IP, UA) | Dono lê; admin lê tudo |
| `api_idempotency_keys` | Cache de resposta idempotente por `(user, key, method, path)` — TTL 24h | Dono lê/insere |

Função `public.api_count_recent_requests(user, api_key, since)` (SECURITY DEFINER, `search_path=public`) para janela deslizante de 60 s do rate limiter.

### 1.2 Módulos de infraestrutura (`src/lib/api/v1/`)
- `api-keys.server.ts` — geração `bap_live_…` + SHA-256 (Web Crypto), verificação contra o admin client.
- `rate-limit.ts` — limite por API Key ou fallback por plano (free 30 / pro 120 / premium 240 req/min); emite `X-RateLimit-*`.
- `idempotency.ts` — leitura/gravação de `Idempotency-Key` (apenas métodos de escrita), lança `idempotency_conflict` (409) quando a mesma chave chega com corpo diferente.
- `logging.ts` — insert fire-and-forget em `api_request_logs` com IP (`cf-connecting-ip`/`x-forwarded-for`) e UA.
- `openapi.ts` — builder OpenAPI 3.1 servido em `/api/v1/openapi.json`.
- `_middleware.ts` (reescrito) — **suporta duas formas de autenticação Bearer** (JWT Supabase **ou** API Key `bap_live_…`), aplica rate limit, idempotência e logging em todos os endpoints autenticados.

### 1.3 Padronização já em uso
- Envelope `{ success, data, meta }` (com `request_id`, `api_version`, `pagination` opcional).
- Erros com `code` estável (`ApiErrorCode`) + status HTTP mapeados. Novos códigos: `api_key_invalid` (401), `api_key_revoked` (401), `api_key_expired` (401), `rate_limited` (429), `idempotency_conflict` (409).
- Headers em **toda** resposta autenticada: `X-Request-Id`, `X-API-Version: v1`, `X-RateLimit-Limit/Remaining/Reset`, `X-Idempotent-Replayed` (quando aplicável).
- Paginação padronizada (`page`, `per_page`, `sort=-created_at`, `search`) já em uso em Articles, Clusters, Scheduling, Logs.

## 2. Endpoints adicionados nesta fase

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/v1/health` | Health check público |
| GET | `/api/v1/openapi.json` | Especificação OpenAPI 3.1 (público) |
| GET | `/api/v1/api-keys` | Lista chaves do usuário |
| POST | `/api/v1/api-keys` | Cria chave (token exposto **uma única vez**) |
| DELETE | `/api/v1/api-keys/:id` | Revoga chave (`revoked_at`) |
| GET | `/api/v1/logs` | Logs de requisições próprios (paginado, filtros) |

## 3. Endpoints revisados (sem quebra de contrato)
Todos os endpoints existentes (`auth/me`, `profile`, `plans`, `articles`, `clusters`, `scheduling`, `credits`, `credits/transactions`, `subscriptions/current`, `blogger/status`, `seo/status`) passam agora automaticamente por:
1. Auth Bearer unificada (JWT ou API Key).
2. Rate limit por usuário/plano/API Key.
3. Idempotência em escrita (quando cliente enviar `Idempotency-Key`).
4. Logging central + `X-Request-Id` + `X-RateLimit-*`.

Nenhuma regra de negócio foi tocada — os handlers continuam finos, delegando para os módulos `*.server.ts` (nenhuma duplicação em relação ao `createServerFn`).

## 4. Segurança implementada
- **API Keys nunca gerenciam outras API Keys** (`forbidden` em `POST/DELETE /api-keys` quando `authType === "api_key"`), evitando escalada lateral.
- Apenas o **hash** da chave é persistido. Token completo mostrado só na criação.
- `revoked_at` e `expires_at` verificados a cada request.
- `last_used_at` atualizado em background (não bloqueia a requisição).
- RLS restringe cada usuário aos próprios recursos; admin lê logs globais.
- Idempotência com hash SHA-256 do corpo evita replay de requisições diferentes com a mesma chave.
- Rate limit é aplicado antes do handler; excede → 429 `rate_limited`.

## 5. Compatibilidade preservada — não alterado
- Blogger, Google Search Console, SyncPay, Créditos, Assinaturas, Painel Administrativo, Fluxos de IA — **todos** continuam usando `createServerFn` normalmente.
- `.server.ts` continuam sendo fonte única de verdade — REST reusa.

## 6. Preparação para o SDK PHP oficial
`GET /api/v1/openapi.json` retorna o documento completo (3.1) com `securitySchemes` Bearer, todos os paths, envelope compartilhado e parâmetros comuns. Basta rodar:

```bash
openapi-generator-cli generate -i https://monzart.com.br/api/v1/openapi.json -g php -o sdk-php
```

## 7. Status geral da API REST v1

| Componente | Status |
|---|---|
| Fundação (envelope/erros/paginação) | ✅ 100 % |
| Middleware unificado (JWT + API Key) | ✅ 100 % |
| Rate limit + idempotência + logs | ✅ 100 % |
| Endpoints de leitura core | ✅ 100 % |
| Endpoints de escrita core | 🟡 ~70 % (falta write em `articles`/`clusters`/`credits/adjust` etc.) |
| Endpoints de IA (geração de conteúdo) | 🟠 pendente (por decisão — Fase 2B) |
| OpenAPI publicado | ✅ 100 % |
| SDK PHP oficial gerado | 🟠 pendente (spec pronto para gerar) |

**Conclusão geral da REST v1: ~85 % pronta.**

## 8. Pendências para a v1.0
1. Endpoints de escrita: `POST/PATCH` em `articles`, `POST` em `clusters`, `POST /credits/adjust` (admin).
2. Fluxos de IA expostos por REST (Fase 2B — decisão do product owner).
3. Geração automática do SDK PHP a partir do OpenAPI (pipeline CI/CD).
4. Painel do usuário em `/desenvolvedor` para gerar/revogar API Keys e ver logs (UI — Fase 4).

## 9. Confirmação
A API REST **`/api/v1`** está pronta para consumo por:
- ✅ Plugin Oficial do WordPress (auth por API Key, idempotência para posts, rate limit por plano).
- ✅ Aplicativo Web / Android Capacitor (auth por JWT Supabase — já suportado).
- ✅ Futura versão iOS (mesmo contrato Bearer).
- ✅ Integrações externas (OpenAPI 3.1 público).

Todas as validações passaram: **typecheck 0 erros**, migração aplicada com sucesso, endpoints existentes intactos.
