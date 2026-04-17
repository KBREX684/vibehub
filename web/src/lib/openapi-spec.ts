import { API_KEY_SCOPES } from "@/lib/api-key-scopes";
import { WEBHOOK_EVENT_NAMES } from "@/lib/webhook-events";
import { MCP_V2_TOOL_NAMES, MCP_V2_TOOL_SCOPES } from "@/lib/mcp-v2-tools";
import { P1_API_PATH_STUBS } from "@/lib/openapi-spec-p1-stubs";

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

export const responses = {
  "200": { description: "Success", content: { "application/json": { schema: successEnvelope } } },
  "400": { description: "Bad request", content: { "application/json": { schema: errorEnvelope } } },
  "401": { description: "Unauthorized", content: { "application/json": { schema: errorEnvelope } } },
  "403": { description: "Forbidden", content: { "application/json": { schema: errorEnvelope } } },
  "402": { description: "Payment required / quota exceeded", content: { "application/json": { schema: errorEnvelope } } },
  "404": { description: "Not found", content: { "application/json": { schema: errorEnvelope } } },
  "409": { description: "Conflict (e.g. idempotency key reuse)", content: { "application/json": { schema: errorEnvelope } } },
  "429": {
    description: "Too many requests (Bearer API key rate limit)",
    headers: {
      "Retry-After": { schema: { type: "string" }, description: "Seconds until reset" },
    },
    content: { "application/json": { schema: errorEnvelope } },
  },
  "500": { description: "Server error", content: { "application/json": { schema: errorEnvelope } } },
} as const;

const OPERATION_METHODS = ["get", "post", "put", "patch", "delete"] as const;

type OpenApiHttpMethod = (typeof OPERATION_METHODS)[number];
type OpenApiOperation = {
  security?: Array<Record<string, string[]>>;
  tags?: string[];
  [key: string]: unknown;
};

const OPERATION_SCOPE_HINTS: Record<string, string> = {
  "GET /api/v1/projects": "read:projects:list",
  "POST /api/v1/projects": "write:projects",
  "GET /api/v1/projects/{slug}": "read:projects:detail",
  "GET /api/v1/creators": "read:creators:list",
  "GET /api/v1/creators/{slug}": "read:creators:detail",
  "GET /api/v1/posts": "read:posts:list",
  "POST /api/v1/posts": "write:posts",
  "GET /api/v1/posts/{slug}": "read:posts:detail",
  "GET /api/v1/teams": "read:teams:list",
  "GET /api/v1/teams/{slug}": "read:team:detail",
  "GET /api/v1/teams/{slug}/tasks": "read:team:tasks",
  "POST /api/v1/teams/{slug}/tasks": "write:team:tasks",
  "PATCH /api/v1/teams/{slug}/tasks/batch": "write:team:tasks",
  "PATCH /api/v1/teams/{slug}/tasks/{taskId}": "write:team:tasks",
  "GET /api/v1/teams/{slug}/tasks/{taskId}/comments": "read:team:tasks",
  "GET /api/v1/teams/{slug}/tasks/{taskId}/activity": "read:team:tasks",
  "GET /api/v1/teams/{slug}/milestones": "read:team:milestones",
  "GET /api/v1/me/teams": "read:teams:self",
  "GET /api/v1/me/enterprise/workspace": "read:enterprise:workspace",
  "GET /api/v1/mcp/search_projects": MCP_V2_TOOL_SCOPES.search_projects,
  "GET /api/v1/mcp/search_creators": MCP_V2_TOOL_SCOPES.search_creators,
  "GET /api/v1/mcp/get_project_detail": MCP_V2_TOOL_SCOPES.get_project_detail,
};

const OPERATION_AUTH_MODE_HINTS: Record<string, string[]> = {
  "GET /api/v1/projects": ["anonymous", "session", "bearer_api_key"],
  "GET /api/v1/projects/{slug}": ["anonymous", "session", "bearer_api_key"],
  "GET /api/v1/creators": ["anonymous", "session", "bearer_api_key"],
  "GET /api/v1/creators/{slug}": ["anonymous", "session", "bearer_api_key"],
  "GET /api/v1/posts": ["anonymous", "session", "bearer_api_key"],
  "GET /api/v1/posts/{slug}": ["anonymous", "session", "bearer_api_key"],
  "GET /api/v1/teams": ["anonymous", "session", "bearer_api_key"],
  "GET /api/v1/teams/{slug}": ["anonymous", "session", "bearer_api_key"],
};

function inferRequiredScope(path: string, method: OpenApiHttpMethod, operation: OpenApiOperation): string | null {
  const authModes = inferAuthModes(path, method, operation);
  if (!authModes.includes("bearer_api_key")) {
    return null;
  }
  if (path === "/api/v1/mcp/v2/invoke" && method === "post") {
    return "per-tool";
  }
  return OPERATION_SCOPE_HINTS[`${method.toUpperCase()} ${path}`] ?? null;
}

function inferAuthModes(path: string, method: OpenApiHttpMethod, operation: OpenApiOperation): string[] {
  const hinted = OPERATION_AUTH_MODE_HINTS[`${method.toUpperCase()} ${path}`];
  if (hinted) {
    return [...hinted];
  }
  const summary = typeof operation.summary === "string" ? operation.summary.toLowerCase() : "";
  const modes = new Set<string>();
  const security = operation.security ?? [];
  if (security.length === 0) {
    if (summary.includes("scoped bearer")) {
      modes.add("anonymous");
      modes.add("session");
      modes.add("bearer_api_key");
      return [...modes];
    }
    modes.add("anonymous");
    return [...modes];
  }
  for (const requirement of security) {
    if (requirement.SessionCookie) {
      modes.add("session");
    }
    if (requirement.BearerApiKey) {
      modes.add("bearer_api_key");
    }
  }
  if (modes.size === 0) {
    modes.add("anonymous");
  }
  return [...modes];
}

function inferRateLimitTier(path: string, method: OpenApiHttpMethod, operation: OpenApiOperation): string {
  const authModes = inferAuthModes(path, method, operation);
  if (path === "/api/v1/mcp/v2/invoke" || authModes.includes("bearer_api_key")) {
    return "api_key_scoped";
  }
  if (authModes.includes("session")) {
    return "session_standard";
  }
  return "public";
}

function decorateOpenApiDocument(doc: Record<string, unknown>) {
  const paths = doc.paths as Record<string, Record<string, OpenApiOperation>>;
  for (const [path, pathItem] of Object.entries(paths)) {
    for (const method of OPERATION_METHODS) {
      const operation = pathItem?.[method];
      if (!operation) continue;
      operation["x-required-scope"] = inferRequiredScope(path, method, operation);
      operation["x-auth-modes"] = inferAuthModes(path, method, operation);
      operation["x-rate-limit-tier"] = inferRateLimitTier(path, method, operation);
    }
  }
  return doc;
}

/** OpenAPI 3.0 document for VibeHub `/api/v1` (P4-4). */
export function buildOpenApiDocument(): Record<string, unknown> {
  const scopeList = [...API_KEY_SCOPES].join(", ");
  return decorateOpenApiDocument({
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
      { name: "mcp", description: "MCP-style read tools (v1 GET)" },
      { name: "mcp-v2", description: "MCP v2 HTTP: manifest + scoped POST invoke" },
      { name: "auth", description: "Demo session" },
      { name: "health", description: "Liveness" },
      { name: "posts", description: "Discussion posts" },
      { name: "comments", description: "Post comments and replies" },
      { name: "challenges", description: "Challenges and campaigns" },
      { name: "creators", description: "Creator profiles and growth" },
      { name: "embed", description: "Embeddable cards and oEmbed" },
      { name: "enterprise", description: "Enterprise workspace and intelligence APIs" },
      { name: "reports", description: "Ecosystem reports" },
      { name: "subscription", description: "Subscription plans and billing-adjacent endpoints" },
      { name: "reputation", description: "Contribution credit and leaderboards" },
      { name: "oauth", description: "OAuth application registration and authorization code flow" },
      { name: "automation", description: "Event-driven workflow automation and external integrations" },
      { name: "admin", description: "Admin-only endpoints" },
      { name: "uploads", description: "Presigned object storage uploads" },
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
      ...P1_API_PATH_STUBS,
      "/api/v1/search": {
        get: {
          tags: ["meta"],
          summary: "Unified full-text search (posts, projects, creators)",
          parameters: [
            { name: "q", in: "query", required: true, schema: { type: "string", minLength: 2 } },
            { name: "type", in: "query", schema: { type: "string", enum: ["post", "project", "creator"] } },
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "limit", in: "query", schema: { type: "integer", default: 20, maximum: 50 } },
          ],
          responses: {
            "200": responses["200"],
            "400": responses["400"],
            "500": responses["500"],
          },
        },
      },
      "/api/v1/health": {
        get: {
          tags: ["health"],
          summary: "Health check (DB/Redis when configured)",
          responses: { "200": responses["200"] },
        },
      },
      "/api/v1/uploads/presign": {
        post: {
          tags: ["uploads"],
          summary: "Presign S3-compatible PUT for image upload (session)",
          security: [{ SessionCookie: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["filename", "contentType", "sizeBytes"],
                  properties: {
                    filename: { type: "string" },
                    contentType: {
                      type: "string",
                      enum: ["image/png", "image/jpeg", "image/webp", "image/gif"],
                    },
                    sizeBytes: { type: "integer", minimum: 1, maximum: 5242880 },
                  },
                },
              },
            },
          },
          responses: {
            "200": responses["200"],
            "400": responses["400"],
            "401": responses["401"],
            "503": responses["500"],
            "500": responses["500"],
          },
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
            { name: "sort", in: "query", schema: { type: "string", enum: ["latest", "hot", "featured", "recommended"] } },
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
            { name: "sort", in: "query", schema: { type: "string", enum: ["recent", "recommended"] } },
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
      "/api/v1/content-guidelines": {
        get: {
          tags: ["meta"],
          summary: "Content guidelines: project templates, post guidelines, quality standards, review rules",
          responses: { "200": responses["200"] },
        },
      },
      "/api/v1/posts/featured": {
        get: {
          tags: ["posts"],
          summary: "List featured (精华) posts only, sorted by featuredAt desc",
          parameters: [
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
          ],
          responses: { "200": responses["200"], "500": responses["500"] },
        },
      },
      "/api/v1/challenges": {
        get: {
          tags: ["challenges"],
          summary: "List challenges / campaigns (public; filter by status)",
          parameters: [
            { name: "status", in: "query", schema: { type: "string", enum: ["draft", "active", "closed"] } },
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
          ],
          responses: { "200": responses["200"], "400": responses["400"], "500": responses["500"] },
        },
        post: {
          tags: ["challenges"],
          summary: "Create a challenge (admin only)",
          security: [{ SessionCookie: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["title", "description", "startDate", "endDate"],
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    rules: { type: "string" },
                    tags: { type: "array", items: { type: "string" } },
                    status: { type: "string", enum: ["draft", "active", "closed"] },
                    startDate: { type: "string", format: "date-time" },
                    endDate: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
          responses: { "201": responses["200"], "400": responses["400"], "401": responses["401"], "403": responses["403"], "500": responses["500"] },
        },
      },
      "/api/v1/challenges/{slug}": {
        get: {
          tags: ["challenges"],
          summary: "Get challenge by slug",
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": responses["200"], "404": responses["404"], "500": responses["500"] },
        },
        patch: {
          tags: ["challenges"],
          summary: "Update challenge (admin only)",
          security: [{ SessionCookie: [] }],
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": responses["200"], "400": responses["400"], "401": responses["401"], "403": responses["403"], "404": responses["404"], "500": responses["500"] },
        },
        delete: {
          tags: ["challenges"],
          summary: "Delete challenge (admin only)",
          security: [{ SessionCookie: [] }],
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": responses["200"], "401": responses["401"], "403": responses["403"], "404": responses["404"], "500": responses["500"] },
        },
      },
      "/api/v1/creators/{slug}/growth": {
        get: {
          tags: ["creators"],
          summary: "Creator growth stats (post/comment/project counts, featured, collaboration intents, received comments)",
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": responses["200"], "404": responses["404"], "500": responses["500"] },
        },
      },
      "/api/v1/embed/projects/{slug}": {
        get: {
          tags: ["embed"],
          summary: "Embeddable project card JSON (Origin allowlist via EMBED_CORS_ORIGINS, public)",
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": responses["200"], "404": responses["404"] },
        },
      },
      "/api/v1/embed/teams/{slug}": {
        get: {
          tags: ["embed"],
          summary: "Embeddable team card JSON (Origin allowlist via EMBED_CORS_ORIGINS, public)",
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": responses["200"], "404": responses["404"] },
        },
      },
      "/api/v1/oembed": {
        get: {
          tags: ["embed"],
          summary: "oEmbed discovery endpoint (CORS enabled, public)",
          parameters: [
            { name: "url", in: "query", required: true, schema: { type: "string" } },
            { name: "format", in: "query", schema: { type: "string", enum: ["json"], default: "json" } },
          ],
          responses: { "200": { description: "oEmbed JSON response" }, "400": responses["400"], "404": responses["404"] },
        },
      },
      "/api/v1/enterprise/project-radar": {
        get: {
          tags: ["enterprise"],
          summary:
            "Enterprise compatibility read: trending projects (session cookie, or Bearer key with read:public or read:enterprise:workspace)",
          security: [{ BearerApiKey: [] }, { SessionCookie: [] }],
          parameters: [{ name: "limit", in: "query", schema: { type: "integer", default: 20, maximum: 100 } }],
          responses: {
            "200": responses["200"],
            "401": responses["401"],
            "403": responses["403"],
            "429": responses["429"],
            "500": responses["500"],
          },
        },
      },
      "/api/v1/enterprise/talent-radar": {
        get: {
          tags: ["enterprise"],
          summary:
            "Enterprise compatibility read: top creators (session cookie, or Bearer key with read:public or read:enterprise:workspace)",
          security: [{ BearerApiKey: [] }, { SessionCookie: [] }],
          parameters: [{ name: "limit", in: "query", schema: { type: "integer", default: 20, maximum: 100 } }],
          responses: {
            "200": responses["200"],
            "401": responses["401"],
            "403": responses["403"],
            "429": responses["429"],
            "500": responses["500"],
          },
        },
      },
      "/api/v1/enterprise/due-diligence/{slug}": {
        get: {
          tags: ["enterprise"],
          summary:
            "Enterprise compatibility read: project due diligence summary (session or Bearer read:public / read:enterprise:workspace)",
          security: [{ BearerApiKey: [] }, { SessionCookie: [] }],
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            "200": responses["200"],
            "401": responses["401"],
            "403": responses["403"],
            "404": responses["404"],
            "429": responses["429"],
            "500": responses["500"],
          },
        },
      },
      "/api/v1/reports/ecosystem": {
        get: {
          tags: ["reports"],
          summary: "Ecosystem report — aggregate metrics (session or Bearer read:public / read:enterprise:workspace compatibility)",
          security: [{ BearerApiKey: [] }, { SessionCookie: [] }],
          parameters: [{ name: "period", in: "query", schema: { type: "string", default: "current" } }],
          responses: {
            "200": responses["200"],
            "401": responses["401"],
            "403": responses["403"],
            "429": responses["429"],
            "500": responses["500"],
          },
        },
      },
      "/api/v1/reports": {
        post: {
          tags: ["reports"],
          summary: "Submit a content report for a discussion post (session cookie)",
          security: [{ SessionCookie: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["postSlug", "reason"],
                  properties: {
                    postSlug: { type: "string", minLength: 1 },
                    reason: { type: "string", minLength: 8, maxLength: 1000 },
                  },
                },
              },
            },
          },
          responses: {
            "201": responses["200"],
            "400": responses["400"],
            "401": responses["401"],
            "404": responses["404"],
            "429": responses["429"],
            "500": responses["500"],
          },
        },
      },
      "/api/v1/teams/{slug}/activity-log": {
        get: {
          tags: ["teams"],
          summary: "Team collaboration activity log (members: session or Bearer read:team:detail)",
          security: [{ BearerApiKey: [] }, { SessionCookie: [] }],
          parameters: [
            { name: "slug", in: "path", required: true, schema: { type: "string" } },
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          ],
          responses: { "200": responses["200"], "401": responses["401"], "429": responses["429"], "500": responses["500"] },
        },
      },
      "/api/v1/me/reputation": {
        get: {
          tags: ["me"],
          summary: "Get current user's contribution credit profile (session cookie)",
          security: [{ SessionCookie: [] }],
          responses: { "200": responses["200"], "401": responses["401"], "500": responses["500"] },
        },
        post: {
          tags: ["me"],
          summary: "Refresh (recompute) current user's contribution credit (session cookie)",
          security: [{ SessionCookie: [] }],
          responses: { "200": responses["200"], "401": responses["401"], "500": responses["500"] },
        },
      },
      "/api/v1/reputation/leaderboard": {
        get: {
          tags: ["reputation"],
          summary: "Public contribution credit leaderboard (top users by score)",
          parameters: [
            { name: "limit", in: "query", schema: { type: "integer", default: 20, maximum: 100 } },
          ],
          responses: { "200": responses["200"], "500": responses["500"] },
        },
      },
      "/api/v1/subscription-plans": {
        get: {
          tags: ["subscription"],
          summary: "List available subscription plans (public)",
          responses: { "200": responses["200"], "500": responses["500"] },
        },
      },
      "/api/v1/me/subscription": {
        get: {
          tags: ["me"],
          summary: "Get current user's subscription, quota limits, pricing, and recent billing records (session cookie)",
          security: [{ SessionCookie: [] }],
          responses: { "200": responses["200"], "401": responses["401"], "500": responses["500"] },
        },
      },
      "/api/v1/billing/checkout": {
        post: {
          tags: ["subscription"],
          summary: "Create a checkout session for Stripe, Alipay, or WeChat Pay (session cookie)",
          security: [{ SessionCookie: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["tier"],
                  properties: {
                    tier: { type: "string", enum: ["pro"] },
                    paymentProvider: { type: "string", enum: ["stripe", "alipay", "wechatpay"], default: "stripe" },
                    successUrl: { type: "string", format: "uri" },
                    cancelUrl: { type: "string", format: "uri" },
                  },
                },
              },
            },
          },
          responses: { "200": responses["200"], "400": responses["400"], "401": responses["401"], "503": responses["500"], "500": responses["500"] },
        },
      },
      "/api/v1/billing/portal": {
        post: {
          tags: ["subscription"],
          summary: "Open Stripe billing portal or return a manual renewal entry for China-local payment channels (session cookie)",
          security: [{ SessionCookie: [] }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    returnUrl: { type: "string", format: "uri" },
                  },
                },
              },
            },
          },
          responses: { "200": responses["200"], "401": responses["401"], "404": responses["404"], "500": responses["500"] },
        },
      },
      "/api/v1/billing/sandbox/records/{recordId}": {
        post: {
          tags: ["subscription"],
          summary: "Advance or refund a China payment sandbox billing record (session cookie, staging only)",
          security: [{ SessionCookie: [] }],
          parameters: [{ name: "recordId", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["action"],
                  properties: {
                    action: { type: "string", enum: ["succeed", "fail", "cancel", "refund"] },
                    failureReason: { type: "string", maxLength: 200 },
                  },
                },
              },
            },
          },
          responses: { "200": responses["200"], "400": responses["400"], "401": responses["401"], "404": responses["404"], "409": responses["409"], "500": responses["500"] },
        },
      },
      "/api/v1/admin/posts/{postId}/feature": {
        post: {
          tags: ["admin"],
          summary: "Mark post as featured / 精华 (admin only)",
          security: [{ SessionCookie: [] }],
          parameters: [{ name: "postId", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": responses["200"], "400": responses["400"], "401": responses["401"], "403": responses["403"], "404": responses["404"], "500": responses["500"] },
        },
        delete: {
          tags: ["admin"],
          summary: "Remove featured status from post (admin only)",
          security: [{ SessionCookie: [] }],
          parameters: [{ name: "postId", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": responses["200"], "401": responses["401"], "403": responses["403"], "404": responses["404"], "500": responses["500"] },
        },
      },
      "/api/v1/posts": {
        get: {
          tags: ["posts"],
          summary: "List discussion posts (public; sort=recent|hot|featured|following|recommended)",
          parameters: [
            { name: "query", in: "query", schema: { type: "string" } },
            { name: "tag", in: "query", schema: { type: "string" } },
            { name: "authorId", in: "query", schema: { type: "string", description: "Filter by post author user id" } },
            { name: "sort", in: "query", schema: { type: "string", enum: ["recent", "hot", "featured", "following", "recommended"] } },
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
            {
              name: "cursor",
              in: "query",
              schema: { type: "string" },
              description:
                "Opaque keyset cursor (P4-3). Only with default/recent sort, no `query`, not featured-only. Response `pagination.nextCursor` when more pages exist.",
            },
          ],
          responses: { "200": responses["200"], "400": responses["400"], "500": responses["500"] },
        },
        post: {
          tags: ["posts"],
          summary: "Create a discussion post (session cookie; enters moderation queue)",
          security: [{ SessionCookie: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["title", "body"],
                  properties: {
                    title: { type: "string", minLength: 3, maxLength: 120 },
                    body: { type: "string", minLength: 10 },
                    tags: { type: "array", items: { type: "string" } },
                  },
                },
              },
            },
          },
          responses: {
            "201": responses["200"],
            "400": responses["400"],
            "401": responses["401"],
            "403": responses["403"],
            "409": responses["409"],
            "500": responses["500"],
          },
        },
      },
      "/api/v1/posts/{slug}": {
        get: {
          tags: ["posts"],
          summary: "Get post by slug with comments (anonymous or authenticated)",
          parameters: [
            { name: "slug", in: "path", required: true, schema: { type: "string" } },
            { name: "page", in: "query", schema: { type: "integer", default: 1, description: "Comment pagination page" } },
            { name: "limit", in: "query", schema: { type: "integer", default: 10, description: "Comment pagination limit" } },
          ],
          responses: { "200": responses["200"], "404": responses["404"], "429": responses["429"], "500": responses["500"] },
        },
        patch: {
          tags: ["posts"],
          summary: "Update post (author or admin; session cookie)",
          security: [{ SessionCookie: [] }],
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    title: { type: "string", minLength: 3, maxLength: 200 },
                    body: { type: "string", minLength: 10, maxLength: 50000 },
                    tags: { type: "array", items: { type: "string", minLength: 1, maxLength: 32 }, maxItems: 10 },
                  },
                },
              },
            },
          },
          responses: { "200": responses["200"], "400": responses["400"], "401": responses["401"], "403": responses["403"], "404": responses["404"], "500": responses["500"] },
        },
        delete: {
          tags: ["posts"],
          summary: "Delete post (author or admin; session cookie)",
          security: [{ SessionCookie: [] }],
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": responses["200"], "401": responses["401"], "403": responses["403"], "404": responses["404"], "500": responses["500"] },
        },
      },
      "/api/v1/comments": {
        get: {
          tags: ["comments"],
          summary: "List comments for a post",
          parameters: [
            { name: "postId", in: "query", required: true, schema: { type: "string" } },
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
          ],
          responses: { "200": responses["200"], "400": responses["400"], "500": responses["500"] },
        },
        post: {
          tags: ["comments"],
          summary: "Create a comment on a post (session cookie)",
          security: [{ SessionCookie: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["postId", "body"],
                  properties: {
                    postId: { type: "string" },
                    body: { type: "string", minLength: 2 },
                  },
                },
              },
            },
          },
          responses: { "201": responses["200"], "400": responses["400"], "401": responses["401"], "404": responses["404"], "500": responses["500"] },
        },
      },
      "/api/v1/comments/{commentId}": {
        patch: {
          tags: ["comments"],
          summary: "Update comment (author only; session cookie)",
          security: [{ SessionCookie: [] }],
          parameters: [{ name: "commentId", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["body"],
                  properties: { body: { type: "string", minLength: 2 } },
                },
              },
            },
          },
          responses: { "200": responses["200"], "400": responses["400"], "401": responses["401"], "403": responses["403"], "404": responses["404"], "500": responses["500"] },
        },
        delete: {
          tags: ["comments"],
          summary: "Delete comment (author or admin; session cookie)",
          security: [{ SessionCookie: [] }],
          parameters: [{ name: "commentId", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": responses["200"], "401": responses["401"], "403": responses["403"], "404": responses["404"], "500": responses["500"] },
        },
      },
      "/api/v1/projects": {
        get: {
          tags: ["projects"],
          summary: "List projects (canonical; anonymous or session or scoped Bearer; supports latest|hot|featured|recommended sort)",
          parameters: [
            { name: "query", in: "query", schema: { type: "string" } },
            { name: "tag", in: "query", schema: { type: "string" } },
            { name: "tech", in: "query", schema: { type: "string" } },
            { name: "team", in: "query", schema: { type: "string" } },
            { name: "creatorId", in: "query", schema: { type: "string" } },
            { name: "status", in: "query", schema: { type: "string" } },
            { name: "sort", in: "query", schema: { type: "string", enum: ["latest", "hot", "featured", "recommended"] } },
            { name: "page", in: "query", schema: { type: "integer" } },
            { name: "limit", in: "query", schema: { type: "integer" } },
            {
              name: "cursor",
              in: "query",
              schema: { type: "string" },
              description:
                "Opaque keyset cursor (P4-3). Only when `query` is unset (stable `updatedAt` + `id` sort). Response `pagination.nextCursor` when more pages exist.",
            },
          ],
          responses: {
            "200": responses["200"],
            "400": responses["400"],
            "401": responses["401"],
            "429": responses["429"],
            "500": responses["500"],
          },
        },
        post: {
          tags: ["projects"],
          summary: "Create project (session cookie; requires creator profile)",
          security: [{ SessionCookie: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["title", "oneLiner", "description"],
                  properties: {
                    title: { type: "string", minLength: 3, maxLength: 120 },
                    oneLiner: { type: "string", minLength: 5, maxLength: 200 },
                    description: { type: "string", minLength: 20 },
                    readmeMarkdown: { type: "string", maxLength: 200000, description: "Optional Markdown README" },
                    techStack: { type: "array", items: { type: "string" } },
                    tags: { type: "array", items: { type: "string" } },
                    status: { type: "string", enum: ["idea", "building", "launched", "paused"] },
                    demoUrl: { type: "string", format: "uri" },
                  },
                },
              },
            },
          },
          responses: {
            "201": responses["200"],
            "400": responses["400"],
            "401": responses["401"],
            "402": responses["402"],
            "403": responses["403"],
            "409": responses["409"],
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
          summary: "Update project fields or team link (creator only; session cookie)",
          security: [{ SessionCookie: [] }],
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    teamSlug: { oneOf: [{ type: "string" }, { type: "null" }] },
                    title: { type: "string" },
                    oneLiner: { type: "string" },
                    description: { type: "string" },
                    readmeMarkdown: { oneOf: [{ type: "string", maxLength: 200000 }, { type: "null" }] },
                    techStack: { type: "array", items: { type: "string" } },
                    tags: { type: "array", items: { type: "string" } },
                    status: { type: "string", enum: ["idea", "building", "launched", "paused"] },
                    demoUrl: { oneOf: [{ type: "string", format: "uri" }, { type: "null" }] },
                  },
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
        delete: {
          tags: ["projects"],
          summary: "Delete project (creator or admin; session cookie)",
          security: [{ SessionCookie: [] }],
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            "200": responses["200"],
            "401": responses["401"],
            "403": responses["403"],
            "404": responses["404"],
            "500": responses["500"],
          },
        },
      },
      "/api/v1/projects/{slug}/readme/sync": {
        post: {
          tags: ["projects"],
          summary: "Sync README from linked GitHub repo default branch (creator; session)",
          security: [{ SessionCookie: [] }],
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            "200": responses["200"],
            "400": responses["400"],
            "401": responses["401"],
            "404": responses["404"],
            "502": responses["500"],
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
        patch: {
          tags: ["teams"],
          summary: "Update team overview settings (owner/admin; session cookie)",
          security: [{ SessionCookie: [] }],
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    name: { type: "string", minLength: 2, maxLength: 80 },
                    mission: { oneOf: [{ type: "string", maxLength: 500 }, { type: "null" }] },
                  },
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
      "/api/v1/teams/{slug}/links": {
        patch: {
          tags: ["teams"],
          summary: "Update team external links (owner/admin; session cookie)",
          security: [{ SessionCookie: [] }],
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    discordUrl: { oneOf: [{ type: "string", format: "uri" }, { type: "null" }] },
                    telegramUrl: { oneOf: [{ type: "string", format: "uri" }, { type: "null" }] },
                    slackUrl: { oneOf: [{ type: "string", format: "uri" }, { type: "null" }] },
                    githubOrgUrl: { oneOf: [{ type: "string", format: "uri" }, { type: "null" }] },
                    githubRepoUrl: { oneOf: [{ type: "string", format: "uri" }, { type: "null" }] },
                  },
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
      "/api/v1/teams/{slug}/chat/token": {
        post: {
          tags: ["teams"],
          summary: "Issue short-lived WS chat token (team member only; session cookie)",
          security: [{ SessionCookie: [] }],
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            "200": responses["200"],
            "401": responses["401"],
            "403": responses["403"],
            "404": responses["404"],
            "500": responses["500"],
          },
        },
      },
      "/api/v1/teams/{slug}/chat/messages": {
        get: {
          tags: ["teams"],
          summary: "List recent team chat messages (30-day retention; team members only)",
          security: [{ BearerApiKey: [] }, { SessionCookie: [] }],
          parameters: [
            { name: "slug", in: "path", required: true, schema: { type: "string" } },
            { name: "limit", in: "query", schema: { type: "integer", default: 50, maximum: 200 } },
          ],
          responses: {
            "200": responses["200"],
            "401": responses["401"],
            "403": responses["403"],
            "404": responses["404"],
            "429": responses["429"],
            "500": responses["500"],
          },
        },
        post: {
          tags: ["teams"],
          summary: "Create team chat message (team member only; session cookie)",
          security: [{ SessionCookie: [] }],
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["body"],
                  properties: {
                    body: { type: "string", minLength: 1, maxLength: 2000 },
                  },
                },
              },
            },
          },
          responses: {
            "201": responses["200"],
            "400": responses["400"],
            "401": responses["401"],
            "403": responses["403"],
            "404": responses["404"],
            "500": responses["500"],
          },
        },
        delete: {
          tags: ["teams"],
          summary: "Prune team chat messages older than 30 days (admin only; session cookie)",
          security: [{ SessionCookie: [] }],
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            "200": responses["200"],
            "401": responses["401"],
            "403": responses["403"],
            "500": responses["500"],
          },
        },
      },
      "/api/v1/teams/{slug}/discussions": {
        get: {
          tags: ["teams"],
          summary: "List team discussions (member: session or Bearer read:team:detail)",
          security: [{ BearerApiKey: [] }, { SessionCookie: [] }],
          parameters: [
            { name: "slug", in: "path", required: true, schema: { type: "string" } },
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          ],
          responses: { "200": responses["200"], "401": responses["401"], "403": responses["403"], "429": responses["429"], "500": responses["500"] },
        },
        post: {
          tags: ["teams"],
          summary: "Create a structured team discussion (session cookie)",
          security: [{ SessionCookie: [] }],
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["title", "body"],
                  properties: {
                    title: { type: "string", minLength: 1, maxLength: 120 },
                    body: { type: "string", minLength: 1, maxLength: 4000 },
                  },
                },
              },
            },
          },
          responses: { "201": responses["200"], "400": responses["400"], "401": responses["401"], "403": responses["403"], "500": responses["500"] },
        },
      },
      "/api/v1/teams/{slug}/members": {
        post: {
          tags: ["teams"],
          summary: "Add an existing user to the team by email with role member|reviewer|admin (owner/admin only; session cookie)",
          security: [{ SessionCookie: [] }],
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email"],
                  properties: {
                    email: { type: "string", format: "email" },
                    role: { type: "string", enum: ["member", "reviewer", "admin"] },
                  },
                },
              },
            },
          },
          responses: { "201": responses["200"], "400": responses["400"], "401": responses["401"], "403": responses["403"], "404": responses["404"], "409": responses["409"], "500": responses["500"] },
        },
      },
      "/api/v1/teams/{slug}/members/{userId}": {
        patch: {
          tags: ["teams"],
          summary: "Update team member role to member|reviewer|admin (owner/admin only; session cookie)",
          security: [{ SessionCookie: [] }],
          parameters: [
            { name: "slug", in: "path", required: true, schema: { type: "string" } },
            { name: "userId", in: "path", required: true, schema: { type: "string" } },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["role"],
                  properties: {
                    role: { type: "string", enum: ["member", "reviewer", "admin"] },
                  },
                },
              },
            },
          },
          responses: { "200": responses["200"], "400": responses["400"], "401": responses["401"], "403": responses["403"], "404": responses["404"], "500": responses["500"] },
        },
        delete: {
          tags: ["teams"],
          summary: "Remove a team member or leave the team (owner/admin or self; session cookie)",
          security: [{ SessionCookie: [] }],
          parameters: [
            { name: "slug", in: "path", required: true, schema: { type: "string" } },
            { name: "userId", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: { "200": responses["200"], "401": responses["401"], "403": responses["403"], "404": responses["404"], "500": responses["500"] },
        },
      },
      "/api/v1/teams/{slug}/agents": {
        get: {
          tags: ["teams"],
          summary: "List agents bound to this team (any team member; session cookie)",
          security: [{ SessionCookie: [] }],
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": responses["200"], "401": responses["401"], "403": responses["403"], "404": responses["404"], "500": responses["500"] },
        },
        post: {
          tags: ["teams"],
          summary: "Add an agent binding to the team with a role card (owner/admin only; session cookie)",
          security: [{ SessionCookie: [] }],
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["agentBindingId"],
                  properties: {
                    agentBindingId: { type: "string" },
                    role: {
                      type: "string",
                      enum: ["reader", "commenter", "executor", "reviewer", "coordinator"],
                    },
                  },
                },
              },
            },
          },
          responses: {
            "201": responses["200"],
            "400": responses["400"],
            "401": responses["401"],
            "403": responses["403"],
            "404": responses["404"],
            "409": responses["409"],
            "500": responses["500"],
          },
        },
      },
      "/api/v1/teams/{slug}/agents/{membershipId}": {
        patch: {
          tags: ["teams"],
          summary: "Update a team agent's role card or active flag (owner/admin only; session cookie)",
          security: [{ SessionCookie: [] }],
          parameters: [
            { name: "slug", in: "path", required: true, schema: { type: "string" } },
            { name: "membershipId", in: "path", required: true, schema: { type: "string" } },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    role: {
                      type: "string",
                      enum: ["reader", "commenter", "executor", "reviewer", "coordinator"],
                    },
                    active: { type: "boolean" },
                  },
                },
              },
            },
          },
          responses: { "200": responses["200"], "400": responses["400"], "401": responses["401"], "403": responses["403"], "404": responses["404"], "500": responses["500"] },
        },
        delete: {
          tags: ["teams"],
          summary: "Remove a team agent membership (owner/admin only; session cookie)",
          security: [{ SessionCookie: [] }],
          parameters: [
            { name: "slug", in: "path", required: true, schema: { type: "string" } },
            { name: "membershipId", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: { "200": responses["200"], "401": responses["401"], "403": responses["403"], "404": responses["404"], "500": responses["500"] },
        },
      },
      "/api/v1/teams/{slug}/agent-audits": {
        get: {
          tags: ["teams"],
          summary: "Paginated agent-action audit timeline for this team (any team member; session cookie)",
          security: [{ SessionCookie: [] }],
          parameters: [
            { name: "slug", in: "path", required: true, schema: { type: "string" } },
            { name: "page", in: "query", required: false, schema: { type: "integer", minimum: 1, default: 1 } },
            { name: "limit", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
            { name: "agentBindingId", in: "query", required: false, schema: { type: "string" } },
          ],
          responses: { "200": responses["200"], "401": responses["401"], "403": responses["403"], "404": responses["404"], "500": responses["500"] },
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
          summary: "Create team task (session or Bearer write:team:tasks)",
          security: [{ BearerApiKey: [] }, { SessionCookie: [] }],
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            "201": responses["200"],
            "401": responses["401"],
            "403": responses["403"],
            "429": responses["429"],
            "500": responses["500"],
          },
        },
      },
      "/api/v1/teams/{slug}/tasks/batch": {
        patch: {
          tags: ["teams"],
          summary: "Batch update task status (owner/admin/reviewer; session or Bearer write:team:tasks; agent-bound keys blocked)",
          security: [{ BearerApiKey: [] }, { SessionCookie: [] }],
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["taskIds", "status"],
                  properties: {
                    taskIds: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 100 },
                    status: { type: "string", enum: ["todo", "doing", "review", "done", "rejected"] },
                  },
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
            "429": responses["429"],
            "500": responses["500"],
          },
        },
      },
      "/api/v1/teams/{slug}/tasks/{taskId}": {
        patch: {
          tags: ["teams"],
          summary: "Update task fields (creator/assignee/reviewer/admin/owner; agent-bound keys route task completion into review flow)",
          security: [{ BearerApiKey: [] }, { SessionCookie: [] }],
          parameters: [
            { name: "slug", in: "path", required: true, schema: { type: "string" } },
            { name: "taskId", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: { "200": responses["200"], "400": responses["400"], "401": responses["401"], "403": responses["403"], "404": responses["404"], "429": responses["429"], "500": responses["500"] },
        },
        delete: {
          tags: ["teams"],
          summary: "Delete task (creator/admin/owner; agent-bound keys receive confirmation_required instead of direct deletion)",
          security: [{ BearerApiKey: [] }, { SessionCookie: [] }],
          parameters: [
            { name: "slug", in: "path", required: true, schema: { type: "string" } },
            { name: "taskId", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: { "200": responses["200"], "401": responses["401"], "403": responses["403"], "404": responses["404"], "429": responses["429"], "500": responses["500"] },
        },
      },
      "/api/v1/teams/{slug}/tasks/{taskId}/comments": {
        get: {
          tags: ["teams"],
          summary: "List task comments (member: session or Bearer read:team:tasks)",
          security: [{ BearerApiKey: [] }, { SessionCookie: [] }],
          parameters: [
            { name: "slug", in: "path", required: true, schema: { type: "string" } },
            { name: "taskId", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: { "200": responses["200"], "401": responses["401"], "403": responses["403"], "429": responses["429"], "500": responses["500"] },
        },
        post: {
          tags: ["teams"],
          summary: "Create task comment (team member; session cookie)",
          security: [{ SessionCookie: [] }],
          parameters: [
            { name: "slug", in: "path", required: true, schema: { type: "string" } },
            { name: "taskId", in: "path", required: true, schema: { type: "string" } },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["body"],
                  properties: {
                    body: { type: "string", minLength: 1, maxLength: 2000 },
                  },
                },
              },
            },
          },
          responses: { "201": responses["200"], "400": responses["400"], "401": responses["401"], "403": responses["403"], "500": responses["500"] },
        },
      },
      "/api/v1/teams/{slug}/tasks/{taskId}/activity": {
        get: {
          tags: ["teams"],
          summary: "List task-scoped activity entries (member: session or Bearer read:team:tasks)",
          security: [{ BearerApiKey: [] }, { SessionCookie: [] }],
          parameters: [
            { name: "slug", in: "path", required: true, schema: { type: "string" } },
            { name: "taskId", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: { "200": responses["200"], "401": responses["401"], "403": responses["403"], "429": responses["429"], "500": responses["500"] },
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
      "/api/v1/me/notifications": {
        get: {
          tags: ["me"],
          summary: "List in-app notifications (session cookie)",
          security: [{ SessionCookie: [] }],
          parameters: [
            { name: "unread", in: "query", schema: { type: "string", enum: ["1", "true"] } },
            { name: "limit", in: "query", schema: { type: "integer" } },
          ],
          responses: { "200": responses["200"], "401": responses["401"], "500": responses["500"] },
        },
        patch: {
          tags: ["me"],
          summary: "Mark notifications read (session cookie)",
          security: [{ SessionCookie: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ids: { type: "array", items: { type: "string" } },
                    markAll: { type: "boolean" },
                  },
                },
              },
            },
          },
          responses: { "200": responses["200"], "400": responses["400"], "401": responses["401"], "500": responses["500"] },
        },
      },
      "/api/v1/me/notification-preferences": {
        get: {
          tags: ["me"],
          summary: "Get in-app notification category preferences (session cookie)",
          security: [{ SessionCookie: [] }],
          responses: { "200": responses["200"], "401": responses["401"], "500": responses["500"] },
        },
        patch: {
          tags: ["me"],
          summary: "Update notification category preferences (session cookie)",
          security: [{ SessionCookie: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    commentReplies: { type: "boolean" },
                    teamUpdates: { type: "boolean" },
                    collaborationModeration: { type: "boolean" },
                    systemAnnouncements: { type: "boolean" },
                  },
                },
              },
            },
          },
          responses: { "200": responses["200"], "400": responses["400"], "401": responses["401"], "500": responses["500"] },
        },
      },
      "/api/v1/me/enterprise/workspace": {
        get: {
          tags: ["me"],
          summary: "Enterprise verification compatibility summary (session or Bearer read:enterprise:workspace)",
          security: [{ BearerApiKey: [] }, { SessionCookie: [] }],
          responses: {
            "200": responses["200"],
            "401": responses["401"],
            "429": responses["429"],
            "500": responses["500"],
          },
        },
      },
      "/api/v1/me/enterprise/verification": {
        get: {
          tags: ["me"],
          summary: "Get current user's enterprise verification status",
          security: [{ SessionCookie: [] }],
          responses: {
            "200": responses["200"],
            "401": responses["401"],
            "500": responses["500"],
          },
        },
        post: {
          tags: ["me"],
          summary: "Submit enterprise verification application",
          security: [{ SessionCookie: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["organizationName", "organizationWebsite", "workEmail"],
                  properties: {
                    organizationName: { type: "string", maxLength: 120 },
                    organizationWebsite: { type: "string", format: "uri", maxLength: 200 },
                    workEmail: { type: "string", format: "email", maxLength: 200 },
                    useCase: { type: "string", maxLength: 2000 },
                  },
                },
              },
            },
          },
          responses: {
            "200": responses["200"],
            "201": responses["200"],
            "400": responses["400"],
            "401": responses["401"],
            "409": { description: "Application already pending or enterprise already approved" },
            "500": responses["500"],
          },
        },
      },
      "/api/v1/admin/webhook-deliveries": {
        get: {
          tags: ["admin"],
          summary: "List webhook delivery log (admin; optional userId filter)",
          security: [{ SessionCookie: [] }],
          parameters: [
            { name: "userId", in: "query", schema: { type: "string" } },
            { name: "limit", in: "query", schema: { type: "integer" } },
          ],
          responses: { "200": responses["200"], "401": responses["401"], "403": responses["403"], "500": responses["500"] },
        },
      },
      "/api/v1/admin/enterprise/verifications": {
        get: {
          tags: ["admin"],
          summary: "List enterprise verification applications (admin only)",
          security: [{ SessionCookie: [] }],
          parameters: [
            { name: "status", in: "query", schema: { type: "string", enum: ["pending", "approved", "rejected", "all"] } },
            { name: "page", in: "query", schema: { type: "integer", minimum: 1 } },
            { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100 } },
          ],
          responses: {
            "200": responses["200"],
            "401": responses["401"],
            "403": responses["403"],
            "500": responses["500"],
          },
        },
        post: {
          tags: ["admin"],
          summary: "Review enterprise verification application (approve/reject)",
          security: [{ SessionCookie: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["applicationId", "action"],
                  properties: {
                    applicationId: { type: "string" },
                    action: { type: "string", enum: ["approve", "reject"] },
                    note: { type: "string", maxLength: 1000 },
                  },
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
            "409": { description: "Application is not pending" },
            "500": responses["500"],
          },
        },
      },
      "/api/v1/admin/ai-suggestions": {
        get: {
          tags: ["admin"],
          summary: "List stored AI moderation suggestions with server-side filters",
          security: [{ SessionCookie: [] }],
          parameters: [
            { name: "targetType", in: "query", schema: { type: "string", enum: ["report_ticket", "enterprise_verification", "post_review", "other"] } },
            { name: "riskLevel", in: "query", schema: { type: "string", enum: ["low", "medium", "high"] } },
            { name: "adminDecision", in: "query", schema: { type: "string", enum: ["pending", "accepted", "modified", "rejected"] } },
            { name: "queue", in: "query", schema: { type: "string" } },
            { name: "page", in: "query", schema: { type: "integer", minimum: 1 } },
            { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100 } },
          ],
          responses: { "200": responses["200"], "401": responses["401"], "403": responses["403"], "500": responses["500"] },
        },
      },
      "/api/v1/admin/ai-suggestions/generate": {
        post: {
          tags: ["admin"],
          summary: "Generate or refresh an AI moderation suggestion for a supported admin task",
          security: [{ SessionCookie: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["targetType", "targetId", "task"],
                  properties: {
                    targetType: { type: "string", enum: ["report_ticket", "enterprise_verification", "post_review", "other"] },
                    targetId: { type: "string" },
                    task: { type: "string", enum: ["summarize_report", "triage_post", "verify_enterprise"] },
                  },
                },
              },
            },
          },
          responses: { "200": responses["200"], "400": responses["400"], "401": responses["401"], "403": responses["403"], "500": responses["500"] },
        },
      },
      "/api/v1/admin/ai-suggestions/{suggestionId}/decision": {
        post: {
          tags: ["admin"],
          summary: "Store an admin decision for an AI moderation suggestion",
          security: [{ SessionCookie: [] }],
          parameters: [{ name: "suggestionId", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["decision"],
                  properties: {
                    decision: { type: "string", enum: ["accepted", "rejected", "modified"] },
                    decisionNote: { type: "string", maxLength: 1000 },
                  },
                },
              },
            },
          },
          responses: { "200": responses["200"], "400": responses["400"], "401": responses["401"], "403": responses["403"], "404": responses["404"], "500": responses["500"] },
        },
      },
      "/api/v1/admin/audit-logs": {
        get: {
          tags: ["admin"],
          summary: "List audit logs with actor, action, agent-binding, and time filters",
          security: [{ SessionCookie: [] }],
          parameters: [
            { name: "actorId", in: "query", schema: { type: "string" } },
            { name: "action", in: "query", schema: { type: "string" } },
            { name: "agentBindingId", in: "query", schema: { type: "string" } },
            { name: "dateFrom", in: "query", schema: { type: "string", format: "date-time" } },
            { name: "dateTo", in: "query", schema: { type: "string", format: "date-time" } },
            { name: "page", in: "query", schema: { type: "integer", minimum: 1 } },
            { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100 } },
          ],
          responses: { "200": responses["200"], "401": responses["401"], "403": responses["403"], "500": responses["500"] },
        },
      },
      "/api/v1/admin/mcp-invoke-audits": {
        get: {
          tags: ["admin"],
          summary: "List MCP invoke audits with tool, status, agent-binding, and time filters",
          security: [{ SessionCookie: [] }],
          parameters: [
            { name: "tool", in: "query", schema: { type: "string" } },
            { name: "status", in: "query", schema: { type: "string", enum: ["success", "error"] } },
            { name: "agentBindingId", in: "query", schema: { type: "string" } },
            { name: "dateFrom", in: "query", schema: { type: "string", format: "date-time" } },
            { name: "dateTo", in: "query", schema: { type: "string", format: "date-time" } },
            { name: "page", in: "query", schema: { type: "integer", minimum: 1 } },
            { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100 } },
          ],
          responses: { "200": responses["200"], "401": responses["401"], "403": responses["403"], "500": responses["500"] },
        },
      },
      "/api/v1/admin/reports/{reportId}/resolve": {
        post: {
          tags: ["admin"],
          summary: "Close a report ticket (admin only)",
          security: [{ SessionCookie: [] }],
          parameters: [
            { name: "reportId", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: {
            "200": responses["200"],
            "401": responses["401"],
            "403": responses["403"],
            "404": responses["404"],
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
                    agentBindingId: { type: "string", description: "Optional named agent binding to attribute API/MCP usage" },
                  },
                },
              },
            },
          },
          responses: { "201": responses["200"], "400": responses["400"], "401": responses["401"], "500": responses["500"] },
        },
      },
      "/api/v1/me/agent-bindings": {
        get: {
          tags: ["me"],
          summary: "List agent bindings for the current user (session cookie only)",
          security: [{ SessionCookie: [] }],
          responses: { "200": responses["200"], "401": responses["401"], "500": responses["500"] },
        },
        post: {
          tags: ["me"],
          summary: "Create a named agent binding (session cookie only)",
          security: [{ SessionCookie: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["label", "agentType"],
                  properties: {
                    label: { type: "string", maxLength: 80 },
                    agentType: { type: "string", maxLength: 40, description: "Provider or runtime name, e.g. openai, cursor, claude-code" },
                    description: { type: "string", maxLength: 280 },
                    active: { type: "boolean" },
                  },
                },
              },
            },
          },
          responses: { "201": responses["200"], "400": responses["400"], "401": responses["401"], "500": responses["500"] },
        },
      },
      "/api/v1/me/oauth-apps": {
        get: {
          tags: ["oauth"],
          summary: "List OAuth apps registered by the current user (session cookie only)",
          security: [{ SessionCookie: [] }],
          responses: { "200": responses["200"], "401": responses["401"], "500": responses["500"] },
        },
        post: {
          tags: ["oauth"],
          summary: "Create an OAuth app (session cookie; returns client secret once)",
          security: [{ SessionCookie: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name", "redirectUris"],
                  properties: {
                    name: { type: "string", minLength: 2, maxLength: 80 },
                    description: { type: "string", maxLength: 500 },
                    redirectUris: { type: "array", items: { type: "string", format: "uri" } },
                    scopes: { type: "array", items: { type: "string" } },
                  },
                },
              },
            },
          },
          responses: { "201": responses["200"], "400": responses["400"], "401": responses["401"], "500": responses["500"] },
        },
      },
      "/api/v1/me/oauth-apps/{appId}": {
        patch: {
          tags: ["oauth"],
          summary: "Update an OAuth app (session cookie only)",
          security: [{ SessionCookie: [] }],
          parameters: [{ name: "appId", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": responses["200"], "400": responses["400"], "401": responses["401"], "404": responses["404"], "500": responses["500"] },
        },
        delete: {
          tags: ["oauth"],
          summary: "Delete an OAuth app (session cookie only)",
          security: [{ SessionCookie: [] }],
          parameters: [{ name: "appId", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": responses["200"], "401": responses["401"], "404": responses["404"], "500": responses["500"] },
        },
      },
      "/api/v1/me/automations": {
        get: {
          tags: ["automation"],
          summary: "List event-driven automations for the current user (session cookie only)",
          security: [{ SessionCookie: [] }],
          responses: { "200": responses["200"], "401": responses["401"], "500": responses["500"] },
        },
        post: {
          tags: ["automation"],
          summary: "Create an automation workflow (session cookie only)",
          security: [{ SessionCookie: [] }],
          responses: { "201": responses["200"], "400": responses["400"], "401": responses["401"], "500": responses["500"] },
        },
      },
      "/api/v1/me/automations/{workflowId}": {
        patch: {
          tags: ["automation"],
          summary: "Update an automation workflow (session cookie only)",
          security: [{ SessionCookie: [] }],
          parameters: [{ name: "workflowId", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": responses["200"], "400": responses["400"], "401": responses["401"], "404": responses["404"], "500": responses["500"] },
        },
        delete: {
          tags: ["automation"],
          summary: "Delete an automation workflow (session cookie only)",
          security: [{ SessionCookie: [] }],
          parameters: [{ name: "workflowId", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": responses["200"], "401": responses["401"], "404": responses["404"], "500": responses["500"] },
        },
      },
      "/api/v1/me/automation-runs": {
        get: {
          tags: ["automation"],
          summary: "List recent automation runs for the current user (session cookie only)",
          security: [{ SessionCookie: [] }],
          responses: { "200": responses["200"], "401": responses["401"], "500": responses["500"] },
        },
      },
      "/api/v1/oauth/token": {
        post: {
          tags: ["oauth"],
          summary: "Exchange authorization code for OAuth Bearer token",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["grant_type", "client_id", "code", "redirect_uri"],
                  properties: {
                    grant_type: { type: "string", enum: ["authorization_code"] },
                    client_id: { type: "string" },
                    client_secret: { type: "string" },
                    code: { type: "string" },
                    redirect_uri: { type: "string", format: "uri" },
                    code_verifier: { type: "string" },
                  },
                },
              },
              "application/x-www-form-urlencoded": {
                schema: {
                  type: "object",
                  required: ["grant_type", "client_id", "code", "redirect_uri"],
                  properties: {
                    grant_type: { type: "string", enum: ["authorization_code"] },
                    client_id: { type: "string" },
                    client_secret: { type: "string" },
                    code: { type: "string" },
                    redirect_uri: { type: "string", format: "uri" },
                    code_verifier: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { "200": responses["200"], "400": responses["400"], "500": responses["500"] },
        },
      },
      "/api/v1/oauth/userinfo": {
        get: {
          tags: ["oauth"],
          summary: "Return the user profile for a valid OAuth Bearer token",
          security: [{ BearerApiKey: [] }, { SessionCookie: [] }],
          responses: { "200": responses["200"], "401": responses["401"], "429": responses["429"], "500": responses["500"] },
        },
      },
      "/api/v1/me/agent-confirmations": {
        get: {
          tags: ["me"],
          summary: "List pending or historical agent confirmation requests visible to the current user (session cookie only)",
          security: [{ SessionCookie: [] }],
          parameters: [
            { name: "status", in: "query", schema: { type: "string", enum: ["pending", "approved", "rejected", "canceled"] } },
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          ],
          responses: { "200": responses["200"], "401": responses["401"], "500": responses["500"] },
        },
        patch: {
          tags: ["me"],
          summary: "Approve or reject an agent confirmation request (session cookie only)",
          security: [{ SessionCookie: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["requestId", "decision"],
                  properties: {
                    requestId: { type: "string" },
                    decision: { type: "string", enum: ["approved", "rejected"] },
                  },
                },
              },
            },
          },
          responses: { "200": responses["200"], "400": responses["400"], "401": responses["401"], "403": responses["403"], "404": responses["404"], "409": responses["409"], "500": responses["500"] },
        },
      },
      "/api/v1/me/agent-audits": {
        get: {
          tags: ["me"],
          summary: "List agent action audits for the current user (session cookie only)",
          security: [{ SessionCookie: [] }],
          parameters: [
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          ],
          responses: { "200": responses["200"], "401": responses["401"], "500": responses["500"] },
        },
      },
      "/api/v1/me/agent-bindings/{bindingId}": {
        patch: {
          tags: ["me"],
          summary: "Update an existing agent binding (session cookie only)",
          security: [{ SessionCookie: [] }],
          parameters: [{ name: "bindingId", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    label: { type: "string", maxLength: 80 },
                    agentType: { type: "string", maxLength: 40 },
                    description: { type: "string", maxLength: 280, nullable: true },
                    active: { type: "boolean" },
                  },
                },
              },
            },
          },
          responses: { "200": responses["200"], "400": responses["400"], "401": responses["401"], "404": responses["404"], "500": responses["500"] },
        },
        delete: {
          tags: ["me"],
          summary: "Delete an agent binding and detach linked API keys (session cookie only)",
          security: [{ SessionCookie: [] }],
          parameters: [{ name: "bindingId", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": responses["200"], "401": responses["401"], "404": responses["404"], "500": responses["500"] },
        },
      },
      "/api/v1/me/agent-bindings/{bindingId}/teams": {
        get: {
          tags: ["me"],
          summary: "List teams this binding participates in, with role card and status (session cookie only)",
          security: [{ SessionCookie: [] }],
          parameters: [{ name: "bindingId", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": responses["200"], "401": responses["401"], "404": responses["404"], "500": responses["500"] },
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
      "/api/v1/me/api-keys/{keyId}/usage": {
        get: {
          tags: ["me"],
          summary: "Get 7-day usage summary and recent MCP invocations for one API key (session cookie)",
          security: [{ SessionCookie: [] }],
          parameters: [
            { name: "keyId", in: "path", required: true, schema: { type: "string" } },
            { name: "days", in: "query", schema: { type: "integer", minimum: 1, maximum: 30, default: 7 } },
            { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 100 } },
          ],
          responses: { "200": responses["200"], "400": responses["400"], "401": responses["401"], "404": responses["404"], "500": responses["500"] },
        },
      },
      "/api/v1/me/webhooks": {
        get: {
          tags: ["me"],
          summary: "List outbound webhook endpoints (session)",
          security: [{ SessionCookie: [] }],
          responses: { "200": responses["200"], "401": responses["401"], "500": responses["500"] },
        },
        post: {
          tags: ["me"],
          summary: "Create webhook endpoint (returns signing secret once)",
          security: [{ SessionCookie: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["url"],
                  properties: {
                    url: { type: "string", format: "uri", description: "Must be https://" },
                    events: {
                      type: "array",
                      items: { type: "string", enum: [...WEBHOOK_EVENT_NAMES] },
                      description: "Optional filter; omit or empty = all supported events",
                    },
                  },
                },
              },
            },
          },
          responses: { "201": responses["200"], "400": responses["400"], "401": responses["401"], "500": responses["500"] },
        },
      },
      "/api/v1/me/webhooks/{webhookId}/test": {
        post: {
          tags: ["me"],
          summary: "Send a signed test payload to the webhook endpoint (session)",
          security: [{ SessionCookie: [] }],
          parameters: [{ name: "webhookId", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": responses["200"], "401": responses["401"], "404": responses["404"], "500": responses["500"] },
        },
      },
      "/api/v1/me/webhook-deliveries": {
        get: {
          tags: ["me"],
          summary: "List recent webhook delivery attempts for current user (session)",
          security: [{ SessionCookie: [] }],
          parameters: [{ name: "limit", in: "query", schema: { type: "integer" } }],
          responses: { "200": responses["200"], "401": responses["401"], "500": responses["500"] },
        },
      },
      "/api/v1/me/webhooks/{webhookId}": {
        patch: {
          tags: ["me"],
          summary: "Update webhook URL, events, or active flag",
          security: [{ SessionCookie: [] }],
          parameters: [{ name: "webhookId", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    url: { type: "string" },
                    events: { type: "array", items: { type: "string", enum: [...WEBHOOK_EVENT_NAMES] } },
                    active: { type: "boolean" },
                  },
                },
              },
            },
          },
          responses: { "200": responses["200"], "400": responses["400"], "401": responses["401"], "404": responses["404"], "500": responses["500"] },
        },
        delete: {
          tags: ["me"],
          summary: "Delete webhook endpoint",
          security: [{ SessionCookie: [] }],
          parameters: [{ name: "webhookId", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": responses["200"], "401": responses["401"], "404": responses["404"], "500": responses["500"] },
        },
      },
      "/api/v1/mcp/v2/manifest": {
        get: {
          tags: ["mcp-v2"],
          summary: "MCP v2 tool manifest (public JSON)",
          responses: { "200": { description: "Manifest" } },
        },
      },
      "/api/v1/mcp/v2/invoke": {
        post: {
          tags: ["mcp-v2"],
          summary: "MCP v2 invoke tool by name (session or Bearer; scope per tool)",
          security: [{ BearerApiKey: [] }, { SessionCookie: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["tool"],
                  properties: {
                    tool: {
                      type: "string",
                      enum: [...MCP_V2_TOOL_NAMES],
                    },
                    input: { type: "object", additionalProperties: true },
                    idempotencyKey: {
                      type: "string",
                      minLength: 8,
                      maxLength: 128,
                      description: "Optional dedupe for write tools (create_post, create_project, …): same user+tool+key → 409.",
                    },
                  },
                },
              },
            },
          },
          description: [
            "Tool scope mapping:",
            ...MCP_V2_TOOL_NAMES.map((name) => `- ${name} -> ${MCP_V2_TOOL_SCOPES[name]}`),
          ].join("\n"),
          responses: {
            "200": responses["200"],
            "201": responses["200"],
            "400": responses["400"],
            "401": responses["401"],
            "402": responses["402"],
            "403": responses["403"],
            "404": responses["404"],
            "409": responses["409"],
            "429": responses["429"],
            "500": responses["500"],
          },
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
  });
}
