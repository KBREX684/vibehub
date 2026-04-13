import { API_KEY_SCOPES } from "@/lib/api-key-scopes";

const metaSchema = {
  type: "object",
  properties: {
    requestId: { type: "string", format: "uuid" },
    timestamp: { type: "string", format: "date-time" },
  },
  required: ["requestId", "timestamp"],
} as const;

const successEnvelope = {
  type: "object",
  properties: {
    data: {},
    meta: metaSchema,
  },
  required: ["data", "meta"],
} as const;

const errorEnvelope = {
  type: "object",
  properties: {
    error: {
      type: "object",
      properties: {
        code: { type: "string" },
        message: { type: "string" },
        details: {},
      },
      required: ["code", "message"],
    },
    meta: metaSchema,
  },
  required: ["error", "meta"],
} as const;

const responses = {
  "200": { description: "Success", content: { "application/json": { schema: successEnvelope } } },
  "400": { description: "Bad request", content: { "application/json": { schema: errorEnvelope } } },
  "401": { description: "Unauthorized", content: { "application/json": { schema: errorEnvelope } } },
  "403": { description: "Forbidden", content: { "application/json": { schema: errorEnvelope } } },
  "404": { description: "Not found", content: { "application/json": { schema: errorEnvelope } } },
  "429": {
    description: "Too many requests (Bearer API key rate limit)",
    headers: {
      "Retry-After": { schema: { type: "string" }, description: "Seconds until reset" },
    },
    content: { "application/json": { schema: errorEnvelope } },
  },
  "500": { description: "Server error", content: { "application/json": { schema: errorEnvelope } } },
} as const;

/** OpenAPI 3.0 document for VibeHub `/api/v1` (P4-4). */
export function buildOpenApiDocument(): Record<string, unknown> {
  const scopeList = [...API_KEY_SCOPES].join(", ");
  return {
    openapi: "3.0.3",
    info: {
      title: "VibeHub API",
      version: "1.0.0",
      description: [
        "VibeHub HTTP API under `/api/v1`.",
        "",
        "**Responses**: Successful JSON uses `{ data, meta }`. Errors use `{ error: { code, message, details? }, meta }`.",
        "",
        "**Auth modes**",
        "- **Public** routes: no `Authorization` header required.",
        "- **Optional auth** (many GETs): anonymous OK; **Cookie** `vibehub_session` or **Bearer** `Authorization: Bearer <vh_...>` for higher quotas / member-only data.",
        "- **Bearer-only scope**: keys carry `scopes` (must include `read:public`). See `POST /api/v1/me/api-keys`.",
        "- **Rate limiting**: Bearer API key requests are limited per key hash + client IP (`API_KEY_RATE_LIMIT_PER_MINUTE`, default 120/min). **429** returns `Retry-After`.",
        "",
        "**Public mirrors** (always unauthenticated): paths under `/api/v1/public/` mirror selected read endpoints.",
        "",
        "**Machine-readable spec**: `GET /api/v1/openapi.json` returns this document as JSON.",
        "",
        `**API key scopes** (subset): \`${scopeList}\``,
      ].join("\n"),
    },
    servers: [{ url: "/", description: "Same origin as the Next.js app" }],
    tags: [
      { name: "meta", description: "Discovery and specification" },
      { name: "public", description: "Unauthenticated read mirrors" },
      { name: "projects", description: "Project gallery" },
      { name: "teams", description: "Teams and membership" },
      { name: "me", description: "Current user" },
      { name: "mcp", description: "MCP-style read tools" },
      { name: "auth", description: "Demo session" },
      { name: "health", description: "Liveness" },
    ],
    components: {
      securitySchemes: {
        BearerApiKey: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "vh_…",
          description: "User API key from `/settings/api-keys`",
        },
        SessionCookie: {
          type: "apiKey",
          in: "cookie",
          name: "vibehub_session",
          description: "Signed session from demo-login or production auth",
        },
      },
      schemas: {
        ApiMeta: metaSchema,
        ApiSuccessEnvelope: successEnvelope,
        ApiErrorEnvelope: errorEnvelope,
      },
    },
    paths: {
      "/api/v1/health": {
        get: {
          tags: ["health"],
          summary: "Health check",
          responses: { "200": responses["200"] },
        },
      },
      "/api/v1/openapi.json": {
        get: {
          tags: ["meta"],
          summary: "OpenAPI 3.0 document (this specification)",
          responses: { "200": { description: "OpenAPI JSON", content: { "application/json": { schema: { type: "object" } } } } },
        },
      },
      "/api/v1/public/projects": {
        get: {
          tags: ["public"],
          summary: "List projects (public mirror)",
          parameters: [
            { name: "query", in: "query", schema: { type: "string" } },
            { name: "tag", in: "query", schema: { type: "string" } },
            { name: "tech", in: "query", schema: { type: "string" } },
            { name: "team", in: "query", schema: { type: "string" } },
            { name: "status", in: "query", schema: { type: "string", enum: ["idea", "building", "launched", "paused"] } },
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          ],
          responses: { "200": responses["200"], "400": responses["400"], "500": responses["500"] },
        },
      },
      "/api/v1/public/projects/{slug}": {
        get: {
          tags: ["public"],
          summary: "Get project by slug (public mirror)",
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": responses["200"], "404": responses["404"], "500": responses["500"] },
        },
      },
      "/api/v1/public/teams": {
        get: {
          tags: ["public"],
          summary: "List teams (public mirror)",
          parameters: [
            { name: "page", in: "query", schema: { type: "integer" } },
            { name: "limit", in: "query", schema: { type: "integer" } },
          ],
          responses: { "200": responses["200"], "500": responses["500"] },
        },
      },
      "/api/v1/public/teams/{slug}": {
        get: {
          tags: ["public"],
          summary: "Get team by slug (public mirror)",
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": responses["200"], "404": responses["404"], "500": responses["500"] },
        },
      },
      "/api/v1/public/creators": {
        get: {
          tags: ["public"],
          summary: "List creators (public mirror)",
          parameters: [
            { name: "query", in: "query", schema: { type: "string" } },
            { name: "page", in: "query", schema: { type: "integer" } },
            { name: "limit", in: "query", schema: { type: "integer" } },
          ],
          responses: { "200": responses["200"], "500": responses["500"] },
        },
      },
      "/api/v1/public/creators/{slug}": {
        get: {
          tags: ["public"],
          summary: "Get creator by slug (public mirror)",
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": responses["200"], "404": responses["404"], "500": responses["500"] },
        },
      },
      "/api/v1/public/collection-topics": {
        get: {
          tags: ["public"],
          summary: "List collection topics (public mirror)",
          responses: { "200": responses["200"], "500": responses["500"] },
        },
      },
      "/api/v1/public/collection-topics/{slug}": {
        get: {
          tags: ["public"],
          summary: "Get topic discovery payload (public mirror)",
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": responses["200"], "404": responses["404"], "500": responses["500"] },
        },
      },
      "/api/v1/projects": {
        get: {
          tags: ["projects"],
          summary: "List projects (canonical; anonymous or session or scoped Bearer)",
          parameters: [
            { name: "query", in: "query", schema: { type: "string" } },
            { name: "tag", in: "query", schema: { type: "string" } },
            { name: "tech", in: "query", schema: { type: "string" } },
            { name: "team", in: "query", schema: { type: "string" } },
            { name: "status", in: "query", schema: { type: "string" } },
            { name: "page", in: "query", schema: { type: "integer" } },
            { name: "limit", in: "query", schema: { type: "integer" } },
          ],
          responses: {
            "200": responses["200"],
            "400": responses["400"],
            "401": responses["401"],
            "429": responses["429"],
            "500": responses["500"],
          },
        },
      },
      "/api/v1/projects/{slug}": {
        get: {
          tags: ["projects"],
          summary: "Get project (canonical; anonymous or session or Bearer scope read:projects:detail)",
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            "200": responses["200"],
            "401": responses["401"],
            "404": responses["404"],
            "429": responses["429"],
            "500": responses["500"],
          },
        },
        patch: {
          tags: ["projects"],
          summary: "Link or unlink project to team (creator only; session cookie)",
          security: [{ SessionCookie: [] }],
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { teamSlug: { oneOf: [{ type: "string" }, { type: "null" }] } },
                },
              },
            },
          },
          responses: {
            "200": responses["200"],
            "400": responses["400"],
            "401": responses["401"],
            "403": responses["403"],
            "404": responses["404"],
            "500": responses["500"],
          },
        },
      },
      "/api/v1/projects/facets": {
        get: {
          tags: ["projects"],
          summary: "Project filter facets (public)",
          responses: { "200": responses["200"], "500": responses["500"] },
        },
      },
      "/api/v1/teams": {
        get: {
          tags: ["teams"],
          summary: "List teams (canonical; optional auth)",
          parameters: [
            { name: "page", in: "query", schema: { type: "integer" } },
            { name: "limit", in: "query", schema: { type: "integer" } },
          ],
          responses: {
            "200": responses["200"],
            "401": responses["401"],
            "429": responses["429"],
            "500": responses["500"],
          },
        },
        post: {
          tags: ["teams"],
          summary: "Create team (session cookie)",
          security: [{ SessionCookie: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name"],
                  properties: {
                    name: { type: "string", minLength: 2, maxLength: 80 },
                    slug: { type: "string" },
                    mission: { type: "string", maxLength: 500 },
                  },
                },
              },
            },
          },
          responses: {
            "201": responses["200"],
            "400": responses["400"],
            "401": responses["401"],
            "500": responses["500"],
          },
        },
      },
      "/api/v1/teams/{slug}": {
        get: {
          tags: ["teams"],
          summary: "Get team detail (canonical; optional auth for viewer join state)",
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            "200": responses["200"],
            "401": responses["401"],
            "404": responses["404"],
            "429": responses["429"],
            "500": responses["500"],
          },
        },
      },
      "/api/v1/teams/{slug}/tasks": {
        get: {
          tags: ["teams"],
          summary: "List team tasks (member: session or Bearer read:team:tasks)",
          security: [{ BearerApiKey: [] }, { SessionCookie: [] }],
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            "200": responses["200"],
            "401": responses["401"],
            "403": responses["403"],
            "429": responses["429"],
            "500": responses["500"],
          },
        },
        post: {
          tags: ["teams"],
          summary: "Create team task (session cookie)",
          security: [{ SessionCookie: [] }],
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          responses: { "201": responses["200"], "401": responses["401"], "403": responses["403"], "500": responses["500"] },
        },
      },
      "/api/v1/teams/{slug}/milestones": {
        get: {
          tags: ["teams"],
          summary: "List team milestones (member: session or Bearer read:team:milestones)",
          security: [{ BearerApiKey: [] }, { SessionCookie: [] }],
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            "200": responses["200"],
            "401": responses["401"],
            "403": responses["403"],
            "429": responses["429"],
            "500": responses["500"],
          },
        },
        post: {
          tags: ["teams"],
          summary: "Create milestone (session cookie)",
          security: [{ SessionCookie: [] }],
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          responses: { "201": responses["200"], "401": responses["401"], "500": responses["500"] },
        },
      },
      "/api/v1/me/teams": {
        get: {
          tags: ["me"],
          summary: "List teams for current user (session or Bearer read:teams:self)",
          security: [{ BearerApiKey: [] }, { SessionCookie: [] }],
          responses: {
            "200": responses["200"],
            "401": responses["401"],
            "429": responses["429"],
            "500": responses["500"],
          },
        },
      },
      "/api/v1/me/api-keys": {
        get: {
          tags: ["me"],
          summary: "List API keys (session cookie only)",
          security: [{ SessionCookie: [] }],
          responses: { "200": responses["200"], "401": responses["401"], "500": responses["500"] },
        },
        post: {
          tags: ["me"],
          summary: "Create API key (session cookie; returns secret once)",
          security: [{ SessionCookie: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["label"],
                  properties: {
                    label: { type: "string", maxLength: 80 },
                    scopes: { type: "array", items: { type: "string" } },
                  },
                },
              },
            },
          },
          responses: { "201": responses["200"], "400": responses["400"], "401": responses["401"], "500": responses["500"] },
        },
      },
      "/api/v1/me/api-keys/{keyId}": {
        delete: {
          tags: ["me"],
          summary: "Revoke API key (session cookie)",
          security: [{ SessionCookie: [] }],
          parameters: [{ name: "keyId", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": responses["200"], "401": responses["401"], "404": responses["404"], "500": responses["500"] },
        },
      },
      "/api/v1/mcp/search_projects": {
        get: {
          tags: ["mcp"],
          summary: "MCP: search projects (session or Bearer read:projects:list)",
          security: [{ BearerApiKey: [] }, { SessionCookie: [] }],
          parameters: [
            { name: "query", in: "query", schema: { type: "string" } },
            { name: "tag", in: "query", schema: { type: "string" } },
            { name: "tech", in: "query", schema: { type: "string" } },
            { name: "team", in: "query", schema: { type: "string" } },
            { name: "status", in: "query", schema: { type: "string" } },
            { name: "page", in: "query", schema: { type: "integer" } },
            { name: "limit", in: "query", schema: { type: "integer" } },
          ],
          responses: {
            "200": responses["200"],
            "400": responses["400"],
            "401": responses["401"],
            "429": responses["429"],
            "500": responses["500"],
          },
        },
      },
      "/api/v1/mcp/search_creators": {
        get: {
          tags: ["mcp"],
          summary: "MCP: search creators (session or Bearer read:creators:list)",
          security: [{ BearerApiKey: [] }, { SessionCookie: [] }],
          parameters: [
            { name: "query", in: "query", schema: { type: "string" } },
            { name: "page", in: "query", schema: { type: "integer" } },
            { name: "limit", in: "query", schema: { type: "integer" } },
          ],
          responses: {
            "200": responses["200"],
            "401": responses["401"],
            "429": responses["429"],
            "500": responses["500"],
          },
        },
      },
      "/api/v1/mcp/get_project_detail": {
        get: {
          tags: ["mcp"],
          summary: "MCP: get project detail (session or Bearer read:projects:detail)",
          security: [{ BearerApiKey: [] }, { SessionCookie: [] }],
          parameters: [{ name: "slug", in: "query", required: true, schema: { type: "string" } }],
          responses: {
            "200": responses["200"],
            "400": responses["400"],
            "401": responses["401"],
            "404": responses["404"],
            "429": responses["429"],
            "500": responses["500"],
          },
        },
      },
      "/api/v1/auth/session": {
        get: {
          tags: ["auth"],
          summary: "Current session (optional cookie)",
          responses: { "200": responses["200"], "401": responses["401"] },
        },
      },
    },
  };
}
