import { describe, expect, it } from "vitest";
import { listTeamActivityLog } from "../src/lib/repository";

describe("listTeamActivityLog", () => {
  it("returns empty for a team with no audit entries", async () => {
    const result = await listTeamActivityLog({ teamSlug: "vibehub-core", page: 1, limit: 10 });
    expect(result.items).toBeDefined();
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.pagination).toBeDefined();
  });

  it("returns empty for non-existent team", async () => {
    const result = await listTeamActivityLog({ teamSlug: "nonexistent-team", page: 1, limit: 10 });
    expect(result.items).toHaveLength(0);
    expect(result.pagination.total).toBe(0);
  });

  it("respects pagination parameters", async () => {
    const result = await listTeamActivityLog({ teamSlug: "vibehub-core", page: 1, limit: 5 });
    expect(result.pagination.limit).toBe(5);
    expect(result.pagination.page).toBe(1);
  });
});
