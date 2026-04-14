import { z } from "zod";
import { buildOpenApiDocument } from "@/lib/openapi-spec";

const pathItemSchema = z.record(z.unknown());

const openApiRootSchema = z.object({
  openapi: z.string(),
  info: z.object({
    title: z.string().min(1),
    version: z.string().min(1),
  }),
  paths: z.record(pathItemSchema),
  components: z.record(z.unknown()).optional(),
});

/** Required path keys that must stay in sync with advertised API surface (P4-5). */
export const REQUIRED_OPENAPI_PATHS = [
  "/api/v1/openapi.json",
  "/api/v1/health",
  "/api/v1/public/projects",
  "/api/v1/projects",
  "/api/v1/posts",
  "/api/v1/posts/{slug}",
  "/api/v1/posts/featured",
  "/api/v1/comments",
  "/api/v1/comments/{commentId}",
  "/api/v1/challenges",
  "/api/v1/teams/{slug}/links",
  "/api/v1/creators/{slug}/growth",
  "/api/v1/me/api-keys",
  "/api/v1/me/reputation",
  "/api/v1/me/subscription",
  "/api/v1/subscription-plans",
  "/api/v1/reputation/leaderboard",
  "/api/v1/embed/projects/{slug}",
  "/api/v1/embed/teams/{slug}",
  "/api/v1/oembed",
  "/api/v1/enterprise/project-radar",
  "/api/v1/enterprise/talent-radar",
  "/api/v1/enterprise/due-diligence/{slug}",
  "/api/v1/reports/ecosystem",
] as const;

/**
 * Throws with a clear message if the document is not a valid OpenAPI 3.x root
 * or is missing required paths (CI gate).
 */
export function validateOpenApiDocument(doc: unknown): void {
  const parsed = openApiRootSchema.safeParse(doc);
  if (!parsed.success) {
    throw new Error(`OpenAPI validation failed: ${parsed.error.message}`);
  }
  const d = parsed.data;
  if (!d.openapi.startsWith("3.")) {
    throw new Error(`OpenAPI validation failed: expected openapi 3.x, got "${d.openapi}"`);
  }
  for (const p of REQUIRED_OPENAPI_PATHS) {
    if (!d.paths[p]) {
      throw new Error(`OpenAPI validation failed: missing required path "${p}"`);
    }
  }
  for (const key of Object.keys(d.paths)) {
    if (!key.startsWith("/")) {
      throw new Error(`OpenAPI validation failed: path keys must start with "/", got "${key}"`);
    }
  }
}

/** Build and validate in one step (scripts / CI). */
export function buildAndValidateOpenApiDocument(): Record<string, unknown> {
  const doc = buildOpenApiDocument();
  validateOpenApiDocument(doc);
  return doc;
}
