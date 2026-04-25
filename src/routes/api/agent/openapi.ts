// GET /api/agent/openapi
// ============================================================
// Especificação OpenAPI 3.0 — usada pelo IBM watsonx Orchestrate
// para registrar as Skills automaticamente.
//
// No Orchestrate: Skills → Import from API → colar esta URL
// ============================================================
import { createAPIFileRoute } from "@tanstack/react-start/api";

const BASE_URL = process.env.PUBLIC_APP_URL ?? "https://your-app.workers.dev";

const spec = {
  openapi: "3.0.3",
  info: {
    title:       "Crisis Aid Orchestrator — Agent Skills",
    description: "Skills expostas para o IBM watsonx Orchestrate. Permitem matching automático de voluntários, recomendações personalizadas e alertas de cobertura.",
    version:     "1.0.0",
  },
  servers: [{ url: BASE_URL }],
  security: [{ bearerAuth: [] }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type:         "http",
        scheme:       "bearer",
        bearerFormat: "API Key",
      },
    },
  },
  paths: {
    "/api/agent/match-volunteers/{actionId}": {
      get: {
        operationId: "matchVolunteersForAction",
        summary:     "Ranqueia voluntários compatíveis com uma ação",
        description: "Executa o algoritmo de matching e retorna os voluntários ordenados por score de compatibilidade. Use quando uma ONG criar ou atualizar uma ação.",
        tags:        ["Matching"],
        parameters: [
          {
            name:        "actionId",
            in:          "path",
            required:    true,
            description: "UUID da ação de crise no banco.",
            schema:      { type: "string" },
          },
          {
            name:        "limit",
            in:          "query",
            required:    false,
            description: "Número máximo de resultados (1–20, padrão 10).",
            schema:      { type: "integer", default: 10, minimum: 1, maximum: 20 },
          },
        ],
        responses: {
          "200": {
            description: "Lista de voluntários ranqueados.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    actionId:        { type: "string" },
                    actionTitle:     { type: "string" },
                    totalVolunteers: { type: "integer" },
                    matches: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          volunteerId: { type: "string" },
                          name:        { type: "string" },
                          score:       { type: "integer", description: "0–100" },
                          reason:      { type: "string" },
                          breakdown: {
                            type: "object",
                            properties: {
                              helpTypeScore:    { type: "integer" },
                              reliabilityScore: { type: "integer" },
                              ratingScore:      { type: "integer" },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Não autorizado." },
          "404": { description: "Ação não encontrada." },
        },
      },
    },

    "/api/agent/recommend/{volunteerId}": {
      get: {
        operationId: "recommendActionsForVolunteer",
        summary:     "Recomenda ações para um voluntário",
        description: "Retorna ações abertas ordenadas por relevância para o perfil do voluntário. Use para personalizar o feed.",
        tags:        ["Recomendações"],
        parameters: [
          {
            name:        "volunteerId",
            in:          "path",
            required:    true,
            description: "UUID do voluntário (auth.uid).",
            schema:      { type: "string" },
          },
          {
            name:        "limit",
            in:          "query",
            required:    false,
            description: "Número máximo de recomendações (1–30, padrão 10).",
            schema:      { type: "integer", default: 10, minimum: 1, maximum: 30 },
          },
        ],
        responses: {
          "200": {
            description: "Ações ordenadas por score.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    volunteerId:     { type: "string" },
                    totalActions:    { type: "integer" },
                    recommendations: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          actionId: { type: "string" },
                          title:    { type: "string" },
                          score:    { type: "integer" },
                          reason:   { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Não autorizado." },
          "404": { description: "Voluntário não encontrado." },
        },
      },
    },

    "/api/agent/coverage-gaps": {
      get: {
        operationId: "getCoverageGaps",
        summary:     "Retorna ações com pouca cobertura de voluntários",
        description: "Lista ações onde a proporção voluntários inscritos/necessários está abaixo do threshold. Use para alertas proativos.",
        tags:        ["Análise"],
        parameters: [
          {
            name:        "threshold",
            in:          "query",
            required:    false,
            description: "Cobertura mínima em % (0–100, padrão 60). Ações abaixo disto são retornadas.",
            schema:      { type: "integer", default: 60, minimum: 0, maximum: 100 },
          },
          {
            name:        "urgency",
            in:          "query",
            required:    false,
            description: "Filtrar por urgência: high | medium | low.",
            schema:      { type: "string", enum: ["high", "medium", "low"] },
          },
        ],
        responses: {
          "200": {
            description: "Ações com gap de cobertura.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    totalActionsAnalyzed: { type: "integer" },
                    threshold:            { type: "integer" },
                    summary: {
                      type: "object",
                      properties: {
                        high:   { type: "integer" },
                        medium: { type: "integer" },
                        low:    { type: "integer" },
                      },
                    },
                    gaps: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          actionId:    { type: "string" },
                          title:       { type: "string" },
                          urgency:     { type: "string" },
                          coveragePct: { type: "integer", description: "% de cobertura atual" },
                          missing:     { type: "integer", description: "Voluntários ainda necessários" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Não autorizado." },
        },
      },
    },

    "/api/agent/invite": {
      post: {
        operationId: "inviteVolunteerToAction",
        summary:     "Envia convite de uma ONG para um voluntário",
        description: "Insere uma notificação do tipo 'invite' para o voluntário. Chamado pelo agente após encontrar matches ou pelo gestor da ONG.",
        tags:        ["Ações"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["volunteerId", "actionId", "actionTitle", "senderName", "senderId"],
                properties: {
                  volunteerId:  { type: "string", description: "UUID do voluntário destinatário." },
                  actionId:     { type: "string", description: "UUID ou ID da ação." },
                  actionTitle:  { type: "string", description: "Título da ação (desnormalizado)." },
                  senderName:   { type: "string", description: "Nome da ONG remetente." },
                  senderId:     { type: "string", description: "UUID do usuário ONG remetente." },
                  message:      { type: "string", description: "Mensagem personalizada (opcional). Se omitida, usa o template padrão." },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Convite enviado com sucesso.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok:          { type: "boolean" },
                    volunteerId: { type: "string" },
                    actionId:    { type: "string" },
                    message:     { type: "string" },
                  },
                },
              },
            },
          },
          "400": { description: "Campos obrigatórios faltando." },
          "401": { description: "Não autorizado." },
          "500": { description: "Erro ao inserir notificação." },
        },
      },
    },
  },
};

export const APIRoute = createAPIFileRoute("/api/agent/openapi")({
  GET: async () => {
    return new Response(JSON.stringify(spec, null, 2), {
      headers: {
        "Content-Type":                "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  },
});
