import { describe, expect, it } from "vitest";
import { getProjectFilterFacets, listProjects } from "../src/lib/repository";

describe("listProjects filters (P2-4)", () => {
  it("filters by tech stack", async () => {
    const result = await listProjects({
      tech: "Next.js",
      page: 1,
      limit: 20,
    });
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.every((p) => p.techStack.some((t) => t.toLowerCase() === "next.js"))).toBe(true);
  });

  it("filters by status", async () => {
    const launched = await listProjects({ status: "launched", page: 1, limit: 20 });
    expect(launched.items.every((p) => p.status === "launched")).toBe(true);
    expect(launched.items.some((p) => p.slug === "prompt-lab")).toBe(true);
  });

  it("combines tag and status", async () => {
    const r = await listProjects({
      tag: "community",
      status: "building",
      page: 1,
      limit: 20,
    });
    expect(r.items.every((p) => p.tags.includes("community") && p.status === "building")).toBe(true);
  });

  it("returns facets from mock projects", async () => {
    const facets = await getProjectFilterFacets();
    expect(facets.tags.length).toBeGreaterThan(0);
    expect(facets.techStack.some((t) => t === "Next.js")).toBe(true);
  });

  it("filters by team slug (P3-3)", async () => {
    const r = await listProjects({ team: "vibehub-core", page: 1, limit: 20 });
    expect(r.items.length).toBeGreaterThan(0);
    expect(r.items.every((p) => p.team?.slug === "vibehub-core")).toBe(true);
  });
});
