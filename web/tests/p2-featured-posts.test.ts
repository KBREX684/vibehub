import { describe, expect, it } from "vitest";
import { featurePost, unfeaturePost, listPosts } from "../src/lib/repository";
import { mockPosts } from "../src/lib/data/mock-data";

describe("featurePost", () => {
  it("marks an approved post as featured", async () => {
    const approved = mockPosts.find((p) => p.reviewStatus === "approved" && !p.featuredAt);
    if (!approved) return;

    const post = await featurePost({ postId: approved.id, adminUserId: "u1" });
    expect(post.featuredAt).toBeDefined();
    expect(post.featuredBy).toBe("u1");
  });

  it("throws POST_NOT_FOUND for non-existent post", async () => {
    await expect(
      featurePost({ postId: "nonexistent", adminUserId: "u1" })
    ).rejects.toThrow("POST_NOT_FOUND");
  });

  it("throws POST_NOT_APPROVED for pending post", async () => {
    const pending = mockPosts.find((p) => p.reviewStatus === "pending");
    if (!pending) return;
    await expect(
      featurePost({ postId: pending.id, adminUserId: "u1" })
    ).rejects.toThrow("POST_NOT_APPROVED");
  });
});

describe("unfeaturePost", () => {
  it("removes featured status from a post", async () => {
    const featured = mockPosts.find((p) => !!p.featuredAt);
    if (!featured) return;

    const post = await unfeaturePost({ postId: featured.id });
    expect(post.featuredAt).toBeUndefined();
    expect(post.featuredBy).toBeUndefined();
  });
});

describe("listPosts sort=featured", () => {
  it("returns only featured posts when featuredOnly=true", async () => {
    // Re-feature a post for this test
    const approved = mockPosts.find((p) => p.reviewStatus === "approved");
    if (!approved) return;
    await featurePost({ postId: approved.id, adminUserId: "u1" });

    const result = await listPosts({ sort: "featured", featuredOnly: true, page: 1, limit: 10 });
    expect(result.items.length).toBeGreaterThan(0);
    result.items.forEach((p) => {
      expect(p.featuredAt).toBeDefined();
    });
  });

  it("featured sort puts featured posts first", async () => {
    const result = await listPosts({ sort: "featured", page: 1, limit: 10 });
    const firstFeaturedIdx = result.items.findIndex((p) => p.featuredAt);
    const firstNonFeaturedIdx = result.items.findIndex((p) => !p.featuredAt);
    if (firstFeaturedIdx >= 0 && firstNonFeaturedIdx >= 0) {
      expect(firstFeaturedIdx).toBeLessThan(firstNonFeaturedIdx);
    }
  });
});
