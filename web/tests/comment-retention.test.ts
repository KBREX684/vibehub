import { describe, it, expect, beforeEach } from "vitest";
import {
  pruneOldComments,
  commentRetentionCutoff,
} from "../src/lib/repository";
import { mockComments } from "../src/lib/data/mock-data";

/**
 * v1.1: Comment retention is now DISABLED by default (COMMENT_RETAIN_DAYS=0).
 * pruneOldComments() returns 0 unless the env var is set.
 * Cleanup is admin-triggered only via POST /api/v1/admin/cleanup.
 */
describe("Comment Retention — long-term default (v1.1)", () => {
  const originalLength = mockComments.length;

  beforeEach(() => {
    while (mockComments.length > originalLength) mockComments.pop();
  });

  it("commentRetentionCutoff returns epoch-0 when retention is disabled", () => {
    const cutoff = commentRetentionCutoff();
    expect(cutoff.getTime()).toBe(0);
  });

  it("pruneOldComments returns 0 when retention disabled (epoch-0 cutoff)", async () => {
    const deleted = await pruneOldComments();
    expect(deleted).toBe(0);
  });

  it("existing comments are not deleted when retention is disabled", async () => {
    const before = mockComments.length;
    // Add old comment
    mockComments.push({
      id: "cm_old_retention_test",
      postId: "post1",
      authorId: "u1",
      authorName: "Alice",
      body: "Old comment that should survive",
      createdAt: new Date(0).toISOString(), // epoch-0 date
    });
    await pruneOldComments();
    expect(mockComments.find((c) => c.id === "cm_old_retention_test")).toBeDefined();
    expect(mockComments.length).toBe(before + 1);
  });
});
