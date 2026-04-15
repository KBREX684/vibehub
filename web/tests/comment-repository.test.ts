import { describe, expect, it } from "vitest";
import { createComment } from "../src/lib/repository";
import { mockPosts } from "../src/lib/data/mock-data";

describe("createComment", () => {
  it("throws POST_NOT_FOUND for non-existent post", async () => {
    await expect(
      createComment({
        postId: "missing-post-id",
        body: "hello",
        authorId: "u1",
      })
    ).rejects.toThrow("POST_NOT_FOUND");
  });

  it("creates comment for existing post", async () => {
    const comment = await createComment({
      postId: mockPosts[0].id,
      body: "valid comment",
      authorId: "u2",
    });

    expect(comment.postId).toBe(mockPosts[0].id);
    expect(comment.body).toBe("valid comment");
  });
});
