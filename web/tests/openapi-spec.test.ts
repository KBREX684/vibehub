import { describe, expect, it } from "vitest";
import { buildOpenApiDocument } from "../src/lib/openapi-spec";
import { validateOpenApiDocument } from "../src/lib/openapi-validate";

describe("OpenAPI spec (P4-4 + P4-5)", () => {
  it("passes structural validation (P4-5 CI gate)", () => {
    const doc = buildOpenApiDocument();
    expect(() => validateOpenApiDocument(doc)).not.toThrow();
  });

  it("is OpenAPI 3.0.3 with required paths", () => {
    const doc = buildOpenApiDocument() as {
      openapi: string;
      paths: Record<string, unknown>;
      info: { title: string };
    };
    expect(doc.openapi).toBe("3.0.3");
    expect(doc.info.title).toBe("VibeHub API");
    expect(doc.paths["/api/v1/openapi.json"]).toBeDefined();
    expect(doc.paths["/api/v1/public/projects"]).toBeDefined();
    expect(doc.paths["/api/v1/me/api-keys"]).toBeDefined();
  });

  it("documents posts patch/delete and MCP v2 tool enum", () => {
    const doc = buildOpenApiDocument() as {
      paths: Record<string, { patch?: unknown; delete?: unknown; post?: { requestBody?: { content?: Record<string, { schema?: { properties?: { tool?: { enum?: string[] } } } }> } } }>;
    };
    const postBySlug = doc.paths["/api/v1/posts/{slug}"];
    expect(postBySlug?.patch).toBeDefined();
    expect(postBySlug?.delete).toBeDefined();

    const mcpInvoke = doc.paths["/api/v1/mcp/v2/invoke"]?.post;
    const tools =
      mcpInvoke?.requestBody?.content?.["application/json"]?.schema?.properties?.tool?.enum ?? [];
    expect(tools).toEqual([
      "search_projects",
      "search_creators",
      "get_project_detail",
      "workspace_summary",
      "list_teams",
      "search_posts",
      "get_post_detail",
      "list_challenges",
      "get_talent_radar",
    ]);
  });
});
