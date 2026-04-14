import { describe, expect, it } from "vitest";
import { getFollowFeed, listPosts } from "../src/lib/repository";

describe("getFollowFeed (P2-6)", () => {
  it("falls back to hot posts when user follows nobody", async () => {
    const feed = await getFollowFeed("u1", { page: 1, limit: 5 });
    const hot = await listPosts({ sort: "hot", page: 1, limit: 5 });
    expect(feed.items.length).toBeGreaterThan(0);
    expect(feed.items.map((p) => p.id).sort()).toEqual(hot.items.map((p) => p.id).sort());
  });
});
