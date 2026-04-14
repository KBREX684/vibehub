import { describe, it, expect, beforeEach } from "vitest";
import { createPost, updatePost, deletePost, getPostBySlug } from "../src/lib/repository";
import { mockPosts, mockUsers } from "../src/lib/data/mock-data";

describe("Post CRUD — updatePost + deletePost (mock mode)", () => {
  let testSlug: string;

  beforeEach(async () => {
    const post = await createPost({
      title: "Test post for CRUD",
      body: "A valid body for testing purposes that is long enough.",
      tags: ["test"],
      authorId: "u1",
    });
    testSlug = post.slug;
  });

  it("updatePost: author can edit their own post", async () => {
    const updated = await updatePost({
      slug: testSlug,
      actorUserId: "u1",
      actorRole: "user",
      title: "Updated title",
    });
    expect(updated.title).toBe("Updated title");
  });

  it("updatePost: non-author cannot edit", async () => {
    await expect(
      updatePost({ slug: testSlug, actorUserId: "u2", actorRole: "user", title: "Nope" })
    ).rejects.toThrow("FORBIDDEN_NOT_AUTHOR");
  });

  it("updatePost: admin can edit any post", async () => {
    const updated = await updatePost({
      slug: testSlug,
      actorUserId: "u2",
      actorRole: "admin",
      body: "Admin updated body",
    });
    expect(updated.body).toBe("Admin updated body");
  });

  it("deletePost: author can delete their own post", async () => {
    await deletePost({ slug: testSlug, actorUserId: "u1", actorRole: "user" });
    const found = await getPostBySlug(testSlug);
    expect(found).toBeNull();
  });

  it("deletePost: non-author cannot delete", async () => {
    await expect(
      deletePost({ slug: testSlug, actorUserId: "u2", actorRole: "user" })
    ).rejects.toThrow("FORBIDDEN_NOT_AUTHOR");
  });

  it("deletePost: throws POST_NOT_FOUND for unknown slug", async () => {
    await expect(
      deletePost({ slug: "no-such-post", actorUserId: "u1", actorRole: "user" })
    ).rejects.toThrow("POST_NOT_FOUND");
  });
});
