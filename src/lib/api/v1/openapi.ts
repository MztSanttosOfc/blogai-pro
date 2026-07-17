// BlogAI Pro — API Oficial v1: gerador de OpenAPI 3.1.
// Fonte única para SDKs (PHP, TS) e para o Plugin Oficial do WordPress.

const envelope = {
  type: "object",
  required: ["success", "meta"],
  properties: {
    success: { type: "boolean" },
    data: {},
    error: {
      type: "object",
      properties: {
        code: { type: "string" },
        message: { type: "string" },
        details: {
          type: "array",
          items: {
            type: "object",
            properties: {
              field: { type: "string" },
              message: { type: "string" },
            },
          },
        },
      },
    },
    meta: {
      type: "object",
      required: ["request_id", "api_version"],
      properties: {
        request_id: { type: "string" },
        api_version: { type: "string", enum: ["v1"] },
        pagination: {
          type: "object",
          properties: {
            page: { type: "integer" },
            per_page: { type: "integer" },
            total: { type: "integer" },
            total_pages: { type: "integer" },
            has_next: { type: "boolean" },
            has_prev: { type: "boolean" },
          },
        },
      },
    },
  },
} as const;

function envelopeResponse(description: string) {
  return {
    description,
    content: { "application/json": { schema: { $ref: "#/components/schemas/Envelope" } } },
  };
}

const commonErrors = {
  "401": envelopeResponse("Não autenticado"),
  "403": envelopeResponse("Sem permissão"),
  "404": envelopeResponse("Recurso não encontrado"),
  "422": envelopeResponse("Erro de validação"),
  "429": envelopeResponse("Limite de requisições excedido (rate_limited)"),
  "500": envelopeResponse("Erro interno"),
};

const paginationParams = [
  { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
  {
    name: "per_page",
    in: "query",
    schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
  },
  { name: "sort", in: "query", schema: { type: "string" }, description: "Prefixe '-' para desc" },
  { name: "search", in: "query", schema: { type: "string" } },
];

export function buildOpenApiDocument(origin: string) {
  return {
    openapi: "3.1.0",
    info: {
      title: "BlogAI Pro — API Oficial",
      version: "1.0.0",
      description:
        "API REST oficial do BlogAI Pro. Base para Plugin do WordPress, Aplicativo Web, Android (Capacitor), futura versão iOS e integrações externas.",
      contact: { name: "BlogAI Pro", url: "https://monzart.com.br" },
    },
    servers: [{ url: `${origin}/api/v1`, description: "API v1" }],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT ou API Key (bap_live_...)",
        },
      },
      schemas: { Envelope: envelope },
      parameters: {
        IdempotencyKey: {
          name: "Idempotency-Key",
          in: "header",
          schema: { type: "string", maxLength: 255 },
          description:
            "Chave de idempotência opcional para POST/PATCH/DELETE. Requisições subsequentes retornam a resposta armazenada por 24h.",
        },
      },
    },
    security: [{ BearerAuth: [] }],
    paths: {
      "/health": {
        get: {
          summary: "Health check público",
          security: [],
          responses: { "200": envelopeResponse("Serviço operacional") },
        },
      },
      "/openapi.json": {
        get: {
          summary: "Especificação OpenAPI (esta)",
          security: [],
          responses: { "200": envelopeResponse("Documento OpenAPI 3.1") },
        },
      },
      "/auth/me": {
        get: {
          summary: "Retorna identidade do usuário autenticado",
          responses: { "200": envelopeResponse("Usuário"), ...commonErrors },
        },
      },
      "/profile": {
        get: {
          summary: "Perfil completo",
          responses: { "200": envelopeResponse("Perfil"), ...commonErrors },
        },
        patch: {
          summary: "Atualiza campos permitidos do perfil",
          parameters: [{ $ref: "#/components/parameters/IdempotencyKey" }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { full_name: { type: "string", maxLength: 120 } },
                },
              },
            },
          },
          responses: { "200": envelopeResponse("Perfil atualizado"), ...commonErrors },
        },
      },
      "/plans": {
        get: {
          summary: "Lista planos ativos (público)",
          security: [],
          responses: { "200": envelopeResponse("Planos") },
        },
      },
      "/api-keys": {
        get: {
          summary: "Lista minhas API Keys",
          responses: { "200": envelopeResponse("Lista de chaves"), ...commonErrors },
        },
        post: {
          summary: "Cria uma nova API Key (token retornado uma única vez)",
          parameters: [{ $ref: "#/components/parameters/IdempotencyKey" }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name"],
                  properties: {
                    name: { type: "string", maxLength: 80 },
                    scopes: { type: "array", items: { type: "string" } },
                    rate_limit_per_minute: { type: "integer", minimum: 10, maximum: 600 },
                    expires_at: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
          responses: { "201": envelopeResponse("Chave criada"), ...commonErrors },
        },
      },
      "/api-keys/{id}": {
        delete: {
          summary: "Revoga uma API Key",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": envelopeResponse("Chave revogada"), ...commonErrors },
        },
      },
      "/logs": {
        get: {
          summary: "Logs de requisições da API do usuário",
          parameters: [
            ...paginationParams,
            { name: "status", in: "query", schema: { type: "integer" } },
            { name: "auth", in: "query", schema: { type: "string", enum: ["jwt", "api_key"] } },
            { name: "method", in: "query", schema: { type: "string" } },
          ],
          responses: { "200": envelopeResponse("Logs paginados"), ...commonErrors },
        },
      },
      "/articles": {
        get: {
          summary: "Lista artigos do usuário",
          parameters: paginationParams,
          responses: { "200": envelopeResponse("Artigos"), ...commonErrors },
        },
      },
      "/articles/{id}": {
        get: {
          summary: "Detalhe do artigo",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": envelopeResponse("Artigo"), ...commonErrors },
        },
        delete: {
          summary: "Remove artigo",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
            { $ref: "#/components/parameters/IdempotencyKey" },
          ],
          responses: { "200": envelopeResponse("Removido"), ...commonErrors },
        },
      },
      "/clusters": {
        get: {
          summary: "Lista clusters",
          parameters: paginationParams,
          responses: { "200": envelopeResponse("Clusters"), ...commonErrors },
        },
      },
      "/clusters/{id}": {
        get: {
          summary: "Detalhe cluster",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": envelopeResponse("Cluster"), ...commonErrors },
        },
        delete: {
          summary: "Remove cluster",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
            { $ref: "#/components/parameters/IdempotencyKey" },
          ],
          responses: { "200": envelopeResponse("Removido"), ...commonErrors },
        },
      },
      "/scheduling": {
        get: {
          summary: "Lista agendamentos",
          parameters: paginationParams,
          responses: { "200": envelopeResponse("Agendamentos"), ...commonErrors },
        },
        post: {
          summary: "Cria agendamento",
          parameters: [{ $ref: "#/components/parameters/IdempotencyKey" }],
          responses: { "201": envelopeResponse("Criado"), ...commonErrors },
        },
      },
      "/scheduling/{id}": {
        delete: {
          summary: "Cancela agendamento",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": envelopeResponse("Cancelado"), ...commonErrors },
        },
      },
      "/credits": {
        get: {
          summary: "Saldo de créditos",
          responses: { "200": envelopeResponse("Créditos"), ...commonErrors },
        },
      },
      "/credits/transactions": {
        get: {
          summary: "Histórico de transações",
          parameters: paginationParams,
          responses: { "200": envelopeResponse("Transações"), ...commonErrors },
        },
      },
      "/subscriptions/current": {
        get: {
          summary: "Assinatura atual",
          responses: { "200": envelopeResponse("Assinatura"), ...commonErrors },
        },
      },
      "/blogger/status": {
        get: {
          summary: "Status da integração Blogger",
          responses: { "200": envelopeResponse("Status"), ...commonErrors },
        },
      },
      "/seo/status": {
        get: {
          summary: "Status do Google Search Console",
          responses: { "200": envelopeResponse("Status"), ...commonErrors },
        },
      },
    },
  } as const;
}
