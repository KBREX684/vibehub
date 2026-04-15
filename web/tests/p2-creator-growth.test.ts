import { describe, expect, it } from "vitest";
import { getCreatorGrowthStats } from "../src/lib/repository";

describe("getCreatorGrowthStats", () => {
  it("returns stats for an existing creator", async () => {
    const stats = await getCreatorGrowthStats("alice-ai-builder");
    expect(stats).not.toBeNull();
    expect(stats!.slug).toBe("alice-ai-builder");
    expect(stats!.postCount).toBeGreaterThanOrEqual(0);
    expect(stats!.commentCount).toBeGreaterThanOrEqual(0);
    expect(stats!.projectCount).toBeGreaterThanOrEqual(0);
    expect(typeof stats!.featuredPostCount).toBe("number");
    expect(typeof stats!.collaborationIntentCount).toBe("number");
    expect(typeof stats!.receivedCommentCount).toBe("number");
  });

  it("returns null for non-existent creator", async () => {
    const stats = await getCreatorGrowthStats("nonexistent-creator");
    expect(stats).toBeNull();
  });

  it("includes accurate project count", async () => {
    const stats = await getCreatorGrowthStats("alice-ai-builder");
    expect(stats).not.toBeNull();
    expect(stats!.projectCount).toBeGreaterThan(0);
  });

  it("returns stats for another creator", async () => {
    const stats = await getCreatorGrowthStats("bob-solo-ops");
    expect(stats).not.toBeNull();
    expect(stats!.slug).toBe("bob-solo-ops");
  });
});
