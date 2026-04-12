import { describe, expect, it } from "vitest";
import { paginateArray } from "@/lib/pagination";

describe("paginateArray", () => {
  it("returns proper page window", () => {
    const source = [1, 2, 3, 4, 5, 6];
    const result = paginateArray(source, 2, 2);

    expect(result.items).toEqual([3, 4]);
    expect(result.pagination.total).toBe(6);
    expect(result.pagination.totalPages).toBe(3);
  });
});
