import { describe, expect, it } from "vitest";
import { createApiKeyUsageSnapshot } from "../src/lib/api-key-usage";
import { buildMcpV2Manifest } from "../src/lib/mcp-v2-tools";
import { buildOpenApiDocument } from "../src/lib/openapi-spec";
import type { McpInvokeAuditRow } from "../src/lib/types";

describe("W5 developer experience", () => {
  it("aggregates API key usage into 7-day summary, daily buckets, and recent calls", () => {
    const rows: McpInvokeAuditRow[] = [
      {
        id: "a3",
        tool: "create_project",
        userId: "u1",
        apiKeyId: "key_1",
        httpStatus: 201,
        durationMs: 120,
        createdAt: "2026-04-17T11:00:00.000Z",
      },
      {
        id: "a2",
        tool: "search_projects",
        userId: "u1",
        apiKeyId: "key_1",
        httpStatus: 500,
        errorCode: "INTERNAL",
        durationMs: 300,
        createdAt: "2026-04-17T02:00:00.000Z",
      },
      {
        id: "a1",
        tool: "search_projects",
        userId: "u1",
        apiKeyId: "key_1",
        httpStatus: 200,
        durationMs: 80,
        createdAt: "2026-04-15T09:00:00.000Z",
      },
    ];

    const usage = createApiKeyUsageSnapshot({
      rows,
      now: new Date("2026-04-17T12:00:00.000Z"),
      days: 7,
      limit: 2,
    });

    expect(usage.summary.last7dCount).toBe(3);
    expect(usage.summary.last24hCount).toBe(2);
    expect(usage.summary.successCount).toBe(2);
    expect(usage.summary.errorCount).toBe(1);
    expect(usage.summary.avgDurationMs).toBe(167);
    expect(usage.summary.uniqueTools).toBe(2);
    expect(usage.daily).toHaveLength(7);
    expect(usage.daily.at(-1)).toMatchObject({ date: "2026-04-17", count: 2, successCount: 1, errorCount: 1 });
    expect(usage.recentInvocations.map((row) => row.id)).toEqual(["a3", "a2"]);
  });

  it("publishes manifest version metadata and tool capability fields", () => {
    const manifest = buildMcpV2Manifest();
    expect(manifest.manifestVersion).toBeTruthy();
    expect(manifest.protocolVersion).toBeTruthy();
    expect(manifest.generatedAt).toContain("T");
    expect(manifest.tools[0]).toHaveProperty("exampleInput");
    expect(manifest.tools[0]).toHaveProperty("capabilityGroup");
    expect(manifest.tools[0]).toHaveProperty("writeTool");
  });

  it("adds W5 OpenAPI metadata for docs and usage endpoint", () => {
    const doc = buildOpenApiDocument() as {
      paths: Record<
        string,
        {
          get?: Record<string, unknown>;
          post?: Record<string, unknown>;
        }
      >;
    };

    expect(doc.paths["/api/v1/me/api-keys/{keyId}/usage"]?.get).toBeDefined();
    expect(doc.paths["/api/v1/projects"]?.get?.["x-required-scope"]).toBe("read:projects:list");
    expect(doc.paths["/api/v1/projects"]?.get?.["x-auth-modes"]).toEqual([
      "anonymous",
      "session",
      "bearer_api_key",
    ]);
    expect(doc.paths["/api/v1/mcp/v2/invoke"]?.post?.["x-required-scope"]).toBe("per-tool");
    expect(doc.paths["/api/v1/mcp/v2/invoke"]?.post?.["x-rate-limit-tier"]).toBe("api_key_scoped");
  });
});
