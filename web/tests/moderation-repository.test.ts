import { describe, expect, it } from "vitest";
import { createPost, listPosts, listPostsForModeration, reviewPost } from "../src/lib/repository";

describe("moderation flow", () => {
  it("new post should enter moderation queue and not appear in public posts", async () => {
    const created = await createPost({
      title: "Pending moderation unit test",
      body: "This post should stay hidden until approved by admin.",
      tags: ["test", "moderation"],
      authorId: "u2",
    });

    expect(created.reviewStatus).toBe("pending");

    const queue = await listPostsForModeration({ status: "pending", page: 1, limit: 200 });
    expect(queue.items.some((item) => item.id === created.id)).toBe(true);

    const publicPosts = await listPosts({ page: 1, limit: 200 });
    expect(publicPosts.items.some((item) => item.id === created.id)).toBe(false);
  });

  it("approved post should become visible in public posts", async () => {
    const created = await createPost({
      title: "Moderation approve unit test",
      body: "This post will be approved in test.",
      tags: ["test", "approve"],
      authorId: "u2",
    });

    const reviewed = await reviewPost({
      postId: created.id,
      action: "approve",
      note: "Looks good",
      adminUserId: "u1",
    });

    expect(reviewed.reviewStatus).toBe("approved");
    expect(reviewed.reviewedBy).toBe("u1");

    const publicPosts = await listPosts({ page: 1, limit: 200 });
    expect(publicPosts.items.some((item) => item.id === created.id)).toBe(true);
  });
});
