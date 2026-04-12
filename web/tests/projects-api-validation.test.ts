import { describe, expect, it } from "vitest";
import { GET as getProjects } from "../src/app/api/v1/projects/route";
import { GET as mcpSearchProjects } from "../src/app/api/v1/mcp/search_projects/route";

describe("projects status validation", () => {
  it("rejects invalid status in /api/v1/projects", async () => {
    const request = new Request("http://localhost:3000/api/v1/projects?status=invalid");
    const response = await getProjects(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("INVALID_STATUS");
  });

  it("rejects invalid status in /api/v1/mcp/search_projects", async () => {
    const request = new Request("http://localhost:3000/api/v1/mcp/search_projects?status=invalid");
    const response = await mcpSearchProjects(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("INVALID_STATUS");
  });
});
