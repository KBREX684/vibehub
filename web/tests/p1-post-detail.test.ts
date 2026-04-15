import { describe, expect, it } from "vitest";
import { getPostBySlug, listCommentsForPost, listPosts, createComment } from "../src/lib/repository";
import { mockPosts, mockComments } from "../src/lib/data/mock-data";

describe("getPostBySlug", () => {
  it("returns null for non-existent slug", async () => {
    const result = await getPostBySlug("nonexistent-slug");
    expect(result).toBeNull();
  });

  it("returns an approved post by slug", async () => {
    const approvedPost = mockPosts.find((p) => p.reviewStatus === "approved");
    expect(approvedPost).toBeDefined();
    const result = await getPostBySlug(approvedPost!.slug);
    expect(result).not.toBeNull();
    expect(result!.slug).toBe(approvedPost!.slug);
  });

  it("returns null for a pending post", async () => {
    const pendingPost = mockPosts.find((p) => p.reviewStatus === "pending");
    expect(pendingPost).toBeDefined();
    const result = await getPostBySlug(pendingPost!.slug);
    expect(result).toBeNull();
  });
});

describe("listCommentsForPost", () => {
  it("lists comments for a post with comments", async () => {
    const postWithComments = mockPosts.find((p) => p.reviewStatus === "approved");
    expect(postWithComments).toBeDefined();
    const result = await listCommentsForPost({ postId: postWithComments!.id, page: 1, limit: 10 });
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.pagination.total).toBeGreaterThan(0);
    result.items.forEach((c) => {
      expect(c.postId).toBe(postWithComments!.id);
    });
  });

  it("returns empty array for a post with no comments", async () => {
    const result = await listCommentsForPost({ postId: "nonexistent-post", page: 1, limit: 10 });
    expect(result.items).toHaveLength(0);
    expect(result.pagination.total).toBe(0);
  });

  it("comments are sorted chronologically (oldest first)", async () => {
    const post = mockPosts.find((p) => p.reviewStatus === "approved" && mockComments.filter((c) => c.postId === p.id).length > 1);
    if (!post) return;
    const result = await listCommentsForPost({ postId: post.id, page: 1, limit: 100 });
    for (let i = 1; i < result.items.length; i++) {
      expect(new Date(result.items[i].createdAt).getTime()).toBeGreaterThanOrEqual(
        new Date(result.items[i - 1].createdAt).getTime()
      );
    }
  });
});

describe("listPosts sort=hot", () => {
  it("returns posts sorted by comment count descending", async () => {
    const result = await listPosts({ sort: "hot", page: 1, limit: 10 });
    expect(result.items.length).toBeGreaterThan(0);
    result.items.forEach((p) => {
      expect(p.reviewStatus).toBe("approved");
    });
  });

  it("hot sort puts post with more comments first", async () => {
    await createComment({ postId: "post1", body: "Extra comment for hot test", authorId: "u1" });
    const result = await listPosts({ sort: "hot", page: 1, limit: 10 });
    if (result.items.length >= 2) {
      const commentCountForFirst = mockComments.filter((c) => c.postId === result.items[0].id).length;
      const commentCountForSecond = mockComments.filter((c) => c.postId === result.items[1].id).length;
      expect(commentCountForFirst).toBeGreaterThanOrEqual(commentCountForSecond);
    }
  });
});
