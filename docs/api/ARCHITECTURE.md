# BlogAI Pro — API Oficial v1

**Status:** Proposta arquitetural (Fase 0 — sem implementação).
**Data:** 2026-07-15
**Escopo desta etapa:** projetar a arquitetura da API REST Oficial. Nenhum endpoint é implementado, nenhuma funcionalidade existente é alterada.

---

## 1. Contexto atual

O BlogAI Pro é uma aplicação TanStack Start (React 19 + Vite + Cloudflare Workers) com Supabase como backend gerenciado. Hoje, toda a comunicação frontend ↔ backend acontece via **`createServerFn`** (RPC serializado do TanStack Start), **não** via HTTP REST em JSON.

Isso é ótimo para o app web (tipagem end-to-end, zero boilerplate), mas **não é consumível** por:

- Plugin WordPress (PHP);
- SDKs externos (JS, PHP, Flutter, Kotlin, Swift);
- Integrações server-to-server de terceiros;
- Ferramentas como Postman / cURL / Zapier.

Portanto, a "API Oficial" será uma **camada REST paralela**, coexistindo com o `createServerFn` — não substituindo.

### 1.1 Inventário de módulos existentes (fontes de verdade)

| Módulo | Arquivo `.server.ts` (lógica reutilizável) | `.functions.ts` (RPC atual) |
|---|---|---|
| Blogger (OAuth + publicação) | `src/lib/blogger.server.ts` | `blogger.functions.ts` |
| Google Search Console / Desempenho SEO | `seo-performance.server.ts` | `seo-performance.functions.ts` |
| Agendamento de publicações | `scheduling.server.ts` | `scheduling.functions.ts` |
| Recompensas (missões + quiz) | `rewards.server.ts` | `rewards.functions.ts` |
| Imagens de artigos (IA) | `article-images.server.ts` | — (usado por `articles.functions.ts`) |
| SyncPay (pagamentos) | `syncpay.server.ts` | `payments.functions.ts` |
| Config server | `config.server.ts` | — |
| Guardas anti-SSRF | `ssrf-guard.ts` | — |
| Artigos (geração IA) | — | `articles.functions.ts` (lógica inline) |
| Clusters | — | `clusters.functions.ts` |
| Páginas legais | — | `pages.functions.ts` |
| Verificação de blog | — | `blog-check.functions.ts` |
| Monetização | — | `monetization.functions.ts` |
| Administração | — | `admin.functions.ts` |

### 1.2 Débito arquitetural identificado

Alguns módulos (`articles`, `clusters`, `pages`, `blog-check`, `monetization`, `admin`) mantêm **toda a lógica dentro do `.handler()`** do `createServerFn`. Isso funciona hoje, mas dificulta reutilização pela camada REST.

**Ação futura (Fase 2):** extrair a lógica desses módulos para novos `*.server.ts` puros (funções que recebem `{ supabase, userId, input }` e retornam DTOs). O `.functions.ts` passará a ser um wrapper fino. Isto é **refactor sem mudança de comportamento**.

---

## 2. Princípios da API v1

1. **Coexistência.** `/api/v1/*` roda ao lado do `createServerFn`. Zero remoção. Zero regressão.
2. **Fonte única de verdade.** REST e RPC chamam a MESMA função pura em `*.server.ts`. Nunca há duas implementações do mesmo caso de uso.
3. **Estabilidade contratual.** Tudo sob `/api/v1/*` é público-estável. Breaking changes → `/api/v2/*`.
4. **Segurança por padrão.** Autenticação obrigatória, exceto endpoints explicitamente marcados como públicos.
5. **Padrões de mercado.** REST, JSON, Bearer, HTTP status codes canônicos, OpenAPI 3.1.
6. **Cloudflare Workers-safe.** Nada de dependências Node-only. Toda I/O usa `fetch`/Supabase JS.

---

## 3. Autenticação

### 3.1 Modelo escolhido: Bearer com token Supabase

- Apps first-party (web, Android/Capacitor, iOS): usam o `access_token` que o Supabase JS já emite. Refresh automático via SDK.
- Integrações externas (Plugin WordPress, terceiros): o usuário gera um token no painel do BlogAI Pro (feature "Chaves de API", **Fase 3** — não faz parte desta etapa). Até lá, o Plugin WordPress usará o mesmo `access_token`.

### 3.2 Header

```
Authorization: Bearer <access_token>
```

### 3.3 Verificação (reuso da infraestrutura atual)

A verificação usa **exatamente** a mesma lógica de `src/integrations/supabase/auth-middleware.ts` (criação de client Supabase com o token do usuário, `supabase.auth.getClaims(token)`, extração de `userId` e `claims`).

A nova camada REST exportará um helper `withAuth(handler)` em `src/lib/api/v1/_middleware.ts` que:
1. Valida o header `Authorization`.
2. Cria um Supabase client autenticado como o usuário (RLS aplicada como o usuário).
3. Injeta `{ supabase, userId, claims }` no handler.
4. Retorna `401 UNAUTHORIZED` padronizado em falha.

### 3.4 Escopos e permissões

- Perfil normal: acesso ao próprio dado (RLS já garante).
- Rotas administrativas (`/api/v1/admin/*`): exigem `has_role(user, 'admin' | 'owner')` verificado via RPC `has_role` já existente. Falha → `403 FORBIDDEN`.
- Rotas Premium (geração de páginas legais, etc.): checagem de `profiles.plan = 'premium'`, idêntica ao que `monetization.functions.ts` já faz.

### 3.5 Rate limiting

**Não haverá rate limiting nesta v1.** O backend do Lovable não expõe primitiva padrão para isso. Se necessário no futuro, será adicionado como middleware ad-hoc (contador em Supabase, chave = `user_id` + rota + janela). Fica documentado como *gap conhecido*.

---

## 4. Versionamento

```
/api/v1/...   ← estável, contratos garantidos
/api/v2/...   ← futuro, quando houver breaking change
```

Regras:

- **Adições** (novos campos opcionais, novos endpoints) são compatíveis e ficam na v1.
- **Remoções, renomeações, mudanças de tipo, mudanças de semântica de status** exigem v2. A v1 permanece disponível por, no mínimo, **6 meses** após v2 GA, com header de aviso `Deprecation: true` e `Sunset: <RFC 3339>`.
- Endpoints internos/experimentais (não estáveis) ficam sob `/api/internal/*` — nunca sob `/api/v1`.

---

## 5. Estrutura de pastas

```
src/routes/api/v1/
├── _middleware.ts           # Helpers: withAuth, withAdmin, envelope, error mapping
├── auth/
│   ├── me.ts                # GET  /api/v1/auth/me
│   └── session.ts           # POST /api/v1/auth/session/refresh (proxy Supabase refresh)
├── profile/
│   └── index.ts             # GET  /api/v1/profile,  PATCH /api/v1/profile
├── credits/
│   ├── index.ts             # GET  /api/v1/credits
│   └── transactions.ts      # GET  /api/v1/credits/transactions
├── articles/
│   ├── index.ts             # GET  /api/v1/articles,   POST /api/v1/articles (gerar)
│   ├── $id.ts               # GET/PATCH/DELETE /api/v1/articles/:id
│   └── $id.publish.ts       # POST /api/v1/articles/:id/publish
├── blogger/
│   ├── connect.ts           # POST /api/v1/blogger/connect (troca de code)
│   ├── blogs.ts             # GET  /api/v1/blogger/blogs
│   └── disconnect.ts        # DELETE /api/v1/blogger/connect
├── scheduling/
│   ├── index.ts             # GET/POST /api/v1/scheduling
│   └── $id.ts               # DELETE  /api/v1/scheduling/:id
├── seo/
│   ├── performance.ts       # GET /api/v1/seo/performance
│   └── status.ts            # GET /api/v1/seo/status
├── clusters/
│   └── index.ts             # GET/POST /api/v1/clusters
├── plans/
│   └── index.ts             # GET /api/v1/plans (público, sem auth)
├── payments/
│   └── checkout.ts          # POST /api/v1/payments/checkout
├── rewards/
│   ├── missions.ts          # GET  /api/v1/rewards/missions
│   └── claim.ts             # POST /api/v1/rewards/claim
└── admin/                   # withAdmin obrigatório
    ├── users.ts
    ├── stats.ts
    └── audit-logs.ts

src/lib/api/v1/
├── envelope.ts              # jsonOk / jsonError / paginated
├── errors.ts                # ApiError + mapeamento erro → status/code
├── pagination.ts            # parseListParams (page, per_page, sort, filter)
├── openapi.ts               # (Fase 4) geração da spec OpenAPI
└── README.md
```

### 5.1 Reuso da lógica existente

Cada rota REST é um **thin adapter**:

```ts
// src/routes/api/v1/scheduling/index.ts (esboço — NÃO implementar nesta fase)
import { createFileRoute } from "@tanstack/react-router";
import { withAuth, jsonOk, jsonError } from "@/lib/api/v1/_middleware";
import { listSchedules, createSchedule } from "@/lib/scheduling.server";

export const Route = createFileRoute("/api/v1/scheduling/")({
  server: {
    handlers: {
      OPTIONS: async () => cors204(),
      GET:  withAuth(async ({ ctx, url }) => {
        const { page, per_page } = parseListParams(url);
        const result = await listSchedules(ctx.supabase, ctx.userId, { page, per_page });
        return jsonOk(result.items, { pagination: result.pagination });
      }),
      POST: withAuth(async ({ ctx, request }) => {
        const body = await request.json();
        const parsed = ScheduleInput.safeParse(body);
        if (!parsed.success) return jsonError("validation_error", parsed.error, 422);
        const created = await createSchedule(ctx.supabase, ctx.userId, parsed.data);
        return jsonOk(created, { status: 201 });
      }),
    },
  },
});
```

- `listSchedules` / `createSchedule` são funções puras em `scheduling.server.ts` (algumas já existem, outras serão extraídas dos `.handler()` atuais na Fase 2).
- O `createServerFn` existente passa a **chamar essas mesmas funções**, garantindo paridade REST ↔ RPC.

---

## 6. Envelope de resposta

**Todas** as respostas seguem exatamente o mesmo shape:

### 6.1 Sucesso

```json
{
  "success": true,
  "data": { ... } | [ ... ],
  "meta": {
    "request_id": "req_01H...",
    "api_version": "v1"
  }
}
```

### 6.2 Sucesso com paginação

```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "request_id": "req_01H...",
    "api_version": "v1",
    "pagination": {
      "page": 1,
      "per_page": 20,
      "total": 137,
      "total_pages": 7,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

### 6.3 Erro

```json
{
  "success": false,
  "error": {
    "code": "validation_error",
    "message": "Mensagem em português para o usuário final",
    "details": [
      { "field": "keyword", "message": "É obrigatório" }
    ]
  },
  "meta": {
    "request_id": "req_01H...",
    "api_version": "v1"
  }
}
```

`details` só aparece em `422 validation_error` e em erros com contexto útil (nunca stack trace, nunca dados internos).

---

## 7. Códigos HTTP

| Status | Quando |
|---|---|
| `200 OK` | GET, PATCH, DELETE bem-sucedidos com corpo |
| `201 Created` | POST que cria recurso |
| `202 Accepted` | Operação assíncrona aceita (ex: agendamento futuro) |
| `204 No Content` | DELETE / OPTIONS bem-sucedidos sem corpo |
| `400 Bad Request` | JSON malformado, parâmetro obrigatório ausente |
| `401 Unauthorized` | Ausência ou invalidade do token |
| `403 Forbidden` | Autenticado, mas sem permissão (não é admin, não é premium) |
| `404 Not Found` | Recurso inexistente ou fora do escopo do usuário (RLS) |
| `409 Conflict` | Conflito de estado (ex: agendamento duplicado, blog já conectado) |
| `422 Unprocessable Entity` | Validação Zod falhou |
| `429 Too Many Requests` | (Reservado — sem uso na v1) |
| `500 Internal Server Error` | Erro não tratado; sempre logado com `request_id` |
| `502 Bad Gateway` | Falha upstream em Google/Blogger/SyncPay |
| `503 Service Unavailable` | Serviço IA indisponível / gateway sem créditos |

### 7.1 Códigos de erro (`error.code`)

Slugs estáveis (não mudam entre versões dentro da v1):

```
unauthorized, invalid_token, forbidden, not_admin, not_premium,
validation_error, invalid_body, missing_field,
not_found, conflict, already_exists,
insufficient_credits, plan_required,
blogger_not_connected, blogger_unauthorized, blogger_publish_failed,
gsc_not_connected, gsc_permission_denied, gsc_no_data,
ai_unavailable, ai_quota_exceeded, ai_rate_limited, ai_content_empty,
payment_failed, payment_provider_error,
upstream_error, internal_error
```

---

## 8. Convenções REST

### 8.1 URLs

- Sempre em inglês, snake_case → NÃO. **kebab-case** (`/api/v1/scheduled-posts`).
- Coleções no plural: `/articles`, não `/article`.
- Recursos aninhados quando existe relação forte: `/articles/:id/publish`.
- Sem trailing slash.
- IDs são UUIDs (Supabase padrão).

### 8.2 Métodos

| Método | Uso | Idempotente |
|---|---|---|
| `GET` | Ler | Sim |
| `POST` | Criar / ação não idempotente | Não |
| `PATCH` | Atualização parcial | Deve ser |
| `PUT` | Substituição total (raro; evitar) | Sim |
| `DELETE` | Remover | Sim |

### 8.3 Query params padronizados (listagem)

```
?page=1&per_page=20&sort=-created_at&status=draft&search=keyword
```

- `page` (default `1`, min `1`).
- `per_page` (default `20`, max `100`).
- `sort`: campo simples, prefixo `-` para desc. Ex: `-created_at`.
- Filtros: um param por campo (`status=draft`, `plan=premium`).
- `search`: busca livre; cada endpoint documenta em que colunas atua.

### 8.4 Payloads

- Sempre JSON. `Content-Type: application/json`.
- Chaves em `snake_case` (compatível com Supabase e Postgres).
- Timestamps em ISO 8601 UTC (`2026-07-15T10:30:00.000Z`).
- Enums em minúsculas (`draft`, `published`, `scheduled`).
- Uploads (imagens) via `multipart/form-data` OU URL pré-assinada (Fase futura).

### 8.5 CORS

Aberto para `/api/v1/*` (`Access-Control-Allow-Origin: *`), pois a API é pública. `OPTIONS` handler obrigatório em toda rota. Headers permitidos: `Content-Type, Authorization, X-Requested-With, Accept, Origin`.

`/api/v1/admin/*` NÃO relaxa CORS — mesma política, autorização acontece dentro do handler.

### 8.6 Idempotency-Key (Fase 3)

Endpoints POST não idempotentes (gerar artigo, criar cobrança) aceitarão header opcional `Idempotency-Key: <uuid>`. Nesta v1 apenas a **reserva do header** está prevista; a implementação vem depois.

---

## 9. Webhooks (planejado — Fase 4)

Estrutura projetada, **não implementada** nesta fase.

### 9.1 Eventos

```
payment.approved, payment.refused, payment.refunded,
subscription.created, subscription.renewed, subscription.canceled,
credits.granted, credits.consumed,
article.generated, article.updated, article.deleted,
publication.completed, publication.failed,
schedule.created, schedule.executed, schedule.failed,
seo.sync.completed
```

### 9.2 Formato

`POST` do BlogAI Pro → URL do assinante:

```json
{
  "id": "evt_01H...",
  "type": "publication.completed",
  "created_at": "2026-07-15T10:30:00Z",
  "api_version": "v1",
  "data": { ... }
}
```

Assinatura HMAC-SHA256 do body em header `X-BlogAI-Signature: t=<unix>,v1=<hex>`. Retry exponencial: 1min, 5min, 30min, 2h, 6h, 24h (7 tentativas).

### 9.3 Armazenamento

Nova tabela `webhook_endpoints` (a criar na Fase 4): `id, user_id, url, secret_hash, events[], active, created_at`.
Nova tabela `webhook_deliveries`: `id, endpoint_id, event_id, status, attempts, last_response_code, last_response_body, delivered_at`.

---

## 10. OpenAPI 3.1 (planejado — Fase 4)

- Spec versionada em `docs/api/openapi.yaml` (source of truth).
- Endpoint `GET /api/v1/openapi.json` serve a versão bundled.
- Swagger UI opcional em `/api/docs` (rota pública).
- SDKs gerados via `openapi-generator`: PHP (Plugin WordPress), JS/TS, Flutter (Dart), Kotlin, Swift.
- Coleção Postman gerada a partir da mesma spec.

---

## 11. Segurança — checklist

- [x] Autenticação obrigatória por padrão (`withAuth`).
- [x] Autorização adicional para admin (`withAdmin` → `has_role`).
- [x] Validação de input com Zod em **toda** rota POST/PATCH.
- [x] Nunca expor: `service_role_key`, senhas, tokens de terceiros, stack traces, IDs de outros usuários.
- [x] SSRF: reuso de `ssrf-guard.ts` em qualquer endpoint que aceite URL do usuário.
- [x] RLS: toda leitura passa pelo client autenticado como usuário (não pelo `supabaseAdmin`), exceto ações administrativas verificadas.
- [x] Segredos lidos apenas dentro do handler (`process.env.X`), nunca em top-level.
- [x] `request_id` em toda resposta (correlação em logs).
- [x] Logs estruturados: `[api:v1:<route>]` prefix, sem PII.
- [ ] Rate limit: gap conhecido, será tratado quando o Lovable expuser primitiva.

---

## 12. Estratégia de reuso — regra de ouro

> Toda função REST em `/api/v1/*` **DEVE** delegar sua lógica para uma função pura em `src/lib/<módulo>.server.ts`. Nunca duplicar lógica. Nunca chamar um `createServerFn` a partir da rota REST.

Diagrama:

```
       ┌──────────────────────────┐
       │  Frontend (React/mobile) │
       └──────────────┬───────────┘
                      │
            useServerFn (RPC)
                      │
                      ▼
       ┌──────────────────────────┐         ┌────────────────────────────┐
       │  *.functions.ts          │         │  routes/api/v1/*.ts (REST) │
       │  (createServerFn wrapper)│         │  (adapter fino)            │
       └──────────────┬───────────┘         └──────────────┬─────────────┘
                      │                                    │
                      └────────────────┬───────────────────┘
                                       │
                                       ▼
                     ┌────────────────────────────────────┐
                     │  *.server.ts  (LÓGICA ÚNICA)       │
                     │  - assina o contrato (input,       │
                     │    supabase, userId) → DTO         │
                     │  - lança ApiError semântico        │
                     └──────────────┬─────────────────────┘
                                    │
                                    ▼
                     ┌────────────────────────────────────┐
                     │  Supabase (RLS) / Google / SyncPay │
                     └────────────────────────────────────┘
```

Erros lançados pela camada `*.server.ts` usarão uma classe única `ApiError(code, message, status, details?)`. O adapter REST mapeia para o envelope 6.3. O `createServerFn` mapeia para `throw new Error(message)` (comportamento atual preservado).

---

## 13. Plano de implementação por fases

| Fase | Escopo | Duração estimada | Risco |
|---|---|---|---|
| **0 (esta)** | Arquitetura + documentação. Zero código de runtime. | 1 rodada | Nenhum |
| **1** | Fundação: `src/lib/api/v1/{envelope,errors,pagination,_middleware}.ts` + `withAuth` + 3 endpoints piloto (`/auth/me`, `/profile`, `/plans`). CORS + OPTIONS. Testes com Postman. | 1–2 rodadas | Baixo |
| **2** | Refactor invisível: extrair lógica de `articles/clusters/pages/blog-check/monetization/admin` para novos `.server.ts` puros. `createServerFn` passa a delegar. Zero mudança de comportamento. | 2 rodadas | Médio (regressão) — mitigar com QA manual dos fluxos |
| **3** | Endpoints REST completos: articles, blogger, scheduling, seo, clusters, credits, payments, rewards, admin. API Keys por usuário (tabela `api_keys` + UI de gestão). Idempotency-Key. | 3–4 rodadas | Médio |
| **4** | OpenAPI 3.1 spec + Swagger UI + Postman collection. Webhooks de saída (endpoints, deliveries, assinatura HMAC, retries). SDK PHP para o Plugin WordPress. | 3 rodadas | Médio |
| **5** | SDKs adicionais (JS/TS, Flutter, Kotlin, Swift). Rate limit (se primitiva Lovable existir). Publicação da documentação pública em `/api/docs`. | Sob demanda | Baixo |

**Cada fase é entregue independentemente. Nada da fase N quebra o app se a fase N+1 não vier.**

---

## 14. Confirmações desta fase

- ✅ **Nenhum arquivo de runtime foi modificado.** Apenas documentação foi criada (`docs/api/ARCHITECTURE.md`).
- ✅ **Nenhuma funcionalidade existente foi alterada:** Blogger, GSC, pagamentos, agendamentos, recompensas, créditos, painel admin — todos permanecem 100% intactos.
- ✅ **`createServerFn` permanece o mecanismo primário** de comunicação frontend ↔ backend.
- ✅ **A futura API REST é aditiva** e reutilizará as funções `.server.ts` como fonte única de verdade.
- ✅ **Contrato estável**: envelope, códigos, versionamento e códigos de erro estão fixados.

---

## 15. Próximo passo

Aguardar aprovação desta arquitetura. Após aprovada, iniciar **Fase 1** (fundação + 3 endpoints piloto) em uma rodada isolada, sem tocar em nenhum módulo existente.
