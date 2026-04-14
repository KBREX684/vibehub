import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { encodeSession } from "../src/lib/auth";
import { createApiKeyForUser, getDemoUser } from "../src/lib/repository";
import { GET as getProjectRadar } from "../src/app/api/v1/enterprise/project-radar/route";
import { GET as getEcosystemReport } from "../src/app/api/v1/reports/ecosystem/route";
import { POST as mcpInvoke } from "../src/app/api/v1/mcp/v2/invoke/route";

function sessionRequest(url: string): NextRequest {
  const session = getDemoUser("user");
  const token = encodeSession(session);
  return new NextRequest(url, { headers: { cookie: `vibehub_session=${token}` } });
}

describe("S4 light enterprise data (read:public key or session)", () => {
  it("allows project radar with session cookie", async () => {
    const res = await getProjectRadar(sessionRequest("http://localhost/api/v1/enterprise/project-radar?limit=3"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data?: unknown[] };
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("allows ecosystem report with Bearer read:public only", async () => {
    const key = await createApiKeyForUser({
      userId: getDemoUser("user").userId,
      label: "s4-public-only",
      scopes: ["read:public"],
    });
    const res = await getEcosystemReport(
      new NextRequest("http://localhost/api/v1/reports/ecosystem?period=test", {
        headers: { authorization: `Bearer ${key.secret}` },
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data?: { period?: string } };
    expect(body.data?.period).toBe("test");
  });
});

describe("S4 MCP v2 write tools", () => {
  it("create_post requires write:posts (or write:mcp:v2:posts alias) on API key", async () => {
    const readOnly = await createApiKeyForUser({
      userId: getDemoUser("user").userId,
      label: "s4-readonly-mcp",
      scopes: ["read:public", "read:posts:list"],
    });
    const res = await mcpInvoke(
      new NextRequest("http://localhost/api/v1/mcp/v2/invoke", {
        method: "POST",
        headers: {
          authorization: `Bearer ${readOnly.secret}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          tool: "create_post",
          input: { title: "MCP title", body: "Body long enough for validation rules here." },
        }),
      })
    );
    expect(res.status).toBe(401);
  });

  it("create_post succeeds with write:posts", async () => {
    const key = await createApiKeyForUser({
      userId: getDemoUser("user").userId,
      label: "s4-mcp-write-post",
      scopes: ["read:public", "write:posts"],
    });
    const suffix = Date.now();
    const res = await mcpInvoke(
      new NextRequest("http://localhost/api/v1/mcp/v2/invoke", {
        method: "POST",
        headers: {
          authorization: `Bearer ${key.secret}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          tool: "create_post",
          input: {
            title: `MCP post ${suffix}`,
            body: "Discussion body created via MCP v2 write tool for automated testing.",
            tags: ["mcp", "e2e"],
          },
        }),
      })
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data?: { output?: { slug?: string; title?: string } } };
    expect(body.data?.output?.title).toContain(`MCP post ${suffix}`);
    expect(body.data?.output?.slug).toBeTruthy();
  });
});
