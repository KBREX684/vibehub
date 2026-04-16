import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { encodeSession } from "../src/lib/auth";
import { getDemoUser } from "../src/lib/repository";
import { GET as getProjects } from "../src/app/api/v1/projects/route";
import { GET as mcpSearchProjects } from "../src/app/api/v1/mcp/search_projects/route";

function cookieRequest(url: string): NextRequest {
  const session = getDemoUser("user");
  const token = encodeSession(session);
  return new NextRequest(url, {
    headers: { cookie: `vibehub_session=${token}` },
  });
}

describe("projects status validation", () => {
  it("rejects invalid status in /api/v1/projects", async () => {
    const request = cookieRequest("http://localhost:3000/api/v1/projects?status=invalid");
    const response = await getProjects(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(["INVALID_STATUS", "INVALID_QUERY_PARAMS"]).toContain(body.error.code);
  });

  it("rejects invalid status in /api/v1/mcp/search_projects", async () => {
    const request = cookieRequest("http://localhost:3000/api/v1/mcp/search_projects?status=invalid");
    const response = await mcpSearchProjects(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("INVALID_QUERY_PARAMS");
  });
});
