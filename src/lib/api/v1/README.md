# API Oficial BlogAI Pro — v1 (Fase 1: fundação)

Camada REST paralela ao `createServerFn`. Contratos estáveis sob `/api/v1/*`.
Ver `docs/api/ARCHITECTURE.md` para o design completo.

## Módulos

- `envelope.ts` — `jsonOk` / `jsonError` / `corsPreflight` / `toErrorResponse`.
- `errors.ts` — `ApiError` + tabela `DEFAULT_STATUS_BY_CODE`.
- `pagination.ts` — `parseListParams` / `buildPagination`.
- `_middleware.ts` — `withAuth` / `withPublic` / `createServerPublishableClient`.

## Endpoints ativos (Fase 1)

| Método | Rota | Auth | Descrição |
| --- | --- | --- | --- |
| GET | `/api/v1/auth/me` | Bearer | Identidade do usuário autenticado |
| GET | `/api/v1/profile` | Bearer | Perfil completo do usuário |
| PATCH | `/api/v1/profile` | Bearer | Atualiza campos permitidos (`full_name`) |
| GET | `/api/v1/plans` | Público | Lista de planos ativos |
| OPTIONS | `*` | — | Pré-flight CORS |

## Contrato

Todas as respostas seguem o envelope descrito em `docs/api/ARCHITECTURE.md §6`:

```json
{ "success": true, "data": ..., "meta": { "request_id": "...", "api_version": "v1" } }
```

Erros carregam `error.code` (slug estável) + mensagem em português.
Cabeçalhos padrão: `X-Request-Id`, `X-API-Version: v1`, CORS liberado.
