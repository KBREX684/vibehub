import { describe, expect, it } from "vitest";
import { createComment, updateComment, deleteComment, listCommentsForPost } from "../src/lib/repository";
import { mockPosts } from "../src/lib/data/mock-data";

describe("updateComment", () => {
  it("author can update their own comment", async () => {
    const post = mockPosts.find((p) => p.reviewStatus === "approved")!;
    const comment = await createComment({ postId: post.id, body: "Original body", authorId: "u2" });
    const updated = await updateComment({ commentId: comment.id, actorUserId: "u2", body: "Updated body" });
    expect(updated.body).toBe("Updated body");
    expect(updated.id).toBe(comment.id);
  });

  it("non-author cannot update comment", async () => {
    const post = mockPosts.find((p) => p.reviewStatus === "approved")!;
    const comment = await createComment({ postId: post.id, body: "Author comment", authorId: "u2" });
    await expect(
      updateComment({ commentId: comment.id, actorUserId: "u3", body: "Hijacked" })
    ).rejects.toThrow("FORBIDDEN_NOT_AUTHOR");
  });

  it("throws COMMENT_NOT_FOUND for non-existent id", async () => {
    await expect(
      updateComment({ commentId: "nonexistent", actorUserId: "u1", body: "test" })
    ).rejects.toThrow("COMMENT_NOT_FOUND");
  });
});

describe("deleteComment", () => {
  it("author can delete their own comment", async () => {
    const post = mockPosts.find((p) => p.reviewStatus === "approved")!;
    const comment = await createComment({ postId: post.id, body: "To be deleted", authorId: "u2" });
    await deleteComment({ commentId: comment.id, actorUserId: "u2", actorRole: "user" });
    const list = await listCommentsForPost({ postId: post.id, page: 1, limit: 100 });
    expect(list.items.find((c) => c.id === comment.id)).toBeUndefined();
  });

  it("admin can delete any comment", async () => {
    const post = mockPosts.find((p) => p.reviewStatus === "approved")!;
    const comment = await createComment({ postId: post.id, body: "Admin will delete", authorId: "u3" });
    await deleteComment({ commentId: comment.id, actorUserId: "u1", actorRole: "admin" });
    const list = await listCommentsForPost({ postId: post.id, page: 1, limit: 100 });
    expect(list.items.find((c) => c.id === comment.id)).toBeUndefined();
  });

  it("non-author non-admin cannot delete", async () => {
    const post = mockPosts.find((p) => p.reviewStatus === "approved")!;
    const comment = await createComment({ postId: post.id, body: "Protected", authorId: "u2" });
    await expect(
      deleteComment({ commentId: comment.id, actorUserId: "u3", actorRole: "user" })
    ).rejects.toThrow("FORBIDDEN_NOT_AUTHOR");
  });

  it("throws COMMENT_NOT_FOUND for non-existent id", async () => {
    await expect(
      deleteComment({ commentId: "nonexistent", actorUserId: "u1", actorRole: "admin" })
    ).rejects.toThrow("COMMENT_NOT_FOUND");
  });
});
