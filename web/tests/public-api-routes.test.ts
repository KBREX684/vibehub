import { describe, expect, it } from "vitest";
import { GET as getPublicProjects } from "../src/app/api/v1/public/projects/route";
import { GET as getPublicProject } from "../src/app/api/v1/public/projects/[slug]/route";

describe("public API routes (P4-3)", () => {
  it("lists projects without auth", async () => {
    const res = await getPublicProjects(new Request("http://localhost/api/v1/public/projects?page=1&limit=5"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data?: { items?: unknown[] } };
    expect(Array.isArray(body.data?.items)).toBe(true);
  });

  it("gets project by slug without auth", async () => {
    const res = await getPublicProject(new Request("http://localhost/test"), {
      params: Promise.resolve({ slug: "vibehub" }),
    });
    expect(res.status).toBe(200);
  });
});
