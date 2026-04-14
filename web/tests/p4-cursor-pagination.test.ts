import { describe, expect, it } from "vitest";
import { listPosts, listProjects } from "../src/lib/repository";
import { decodeCursor } from "../src/lib/pagination-cursor";

describe("P4-3 cursor pagination (mock)", () => {
  it("listProjects returns nextCursor and stable second page", async () => {
    const first = await listProjects({ page: 1, limit: 2 });
    expect(first.pagination.nextCursor).toBeDefined();
    const cur = first.pagination.nextCursor!;
    const decoded = decodeCursor(cur);
    expect(decoded?.t && decoded?.id).toBeTruthy();

    const second = await listProjects({ page: 1, limit: 2, cursor: cur });
    expect(second.items.length).toBeGreaterThan(0);
    const overlap = new Set(first.items.map((p) => p.id));
    for (const p of second.items) {
      expect(overlap.has(p.id)).toBe(false);
    }
    const ids = [...first.items.map((p) => p.id), ...second.items.map((p) => p.id)];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("listPosts returns nextCursor for default sort without query", async () => {
    const first = await listPosts({ page: 1, limit: 2, sort: "recent" });
    expect(first.pagination.nextCursor).toBeDefined();
    const second = await listPosts({ page: 1, limit: 2, sort: "recent", cursor: first.pagination.nextCursor });
    const overlap = new Set(first.items.map((p) => p.id));
    for (const p of second.items) {
      expect(overlap.has(p.id)).toBe(false);
    }
  });

  it("rejects cursor with full-text query on projects", async () => {
    await expect(listProjects({ query: "test", page: 1, limit: 5, cursor: "not-used" })).rejects.toMatchObject({
      code: "INVALID_INPUT",
    });
  });
});
