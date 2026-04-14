import { describe, expect, it } from "vitest";
import { unifiedSearchPaged } from "../src/lib/repository";

describe("unifiedSearchPaged (P3-2)", () => {
  it("returns paginated slice for post type in mock mode", async () => {
    const r = await unifiedSearchPaged({ query: "vibehub", type: "post", page: 1, limit: 5 });
    expect(r.page).toBe(1);
    expect(r.limit).toBe(5);
    expect(r.total).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(r.results)).toBe(true);
  });
});
