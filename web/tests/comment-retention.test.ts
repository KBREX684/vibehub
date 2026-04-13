import { describe, it, expect, beforeEach } from "vitest";
import {
  pruneOldComments,
  commentRetentionCutoff,
} from "../src/lib/repository";
import { mockComments } from "../src/lib/data/mock-data";

describe("Comment Retention Cleanup (mock mode)", () => {
  const originalLength = mockComments.length;

  beforeEach(() => {
    // Restore original comments + add old ones for each test
    while (mockComments.length > originalLength) mockComments.pop();
  });

  it("pruneOldComments: keeps recent comments intact", async () => {
    const before = mockComments.length;
    const deleted = await pruneOldComments();
    expect(deleted).toBe(0);
    expect(mockComments.length).toBe(before);
  });

  it("pruneOldComments: removes root comments older than 7 days", async () => {
    const old = new Date();
    old.setUTCDate(old.getUTCDate() - 8);
    mockComments.push({
      id: "cm_old_root",
      postId: "post1",
      authorId: "u1",
      authorName: "Alice",
      body: "Old root comment",
      createdAt: old.toISOString(),
    });

    const deleted = await pruneOldComments();
    expect(deleted).toBeGreaterThanOrEqual(1);
    expect(mockComments.find((c) => c.id === "cm_old_root")).toBeUndefined();
  });

  it("pruneOldComments: also removes replies of old root comments", async () => {
    const old = new Date();
    old.setUTCDate(old.getUTCDate() - 9);
    mockComments.push(
      {
        id: "cm_old_root2",
        postId: "post1",
        authorId: "u1",
        authorName: "Alice",
        body: "Old root",
        createdAt: old.toISOString(),
      },
      {
        id: "cm_old_reply",
        postId: "post1",
        authorId: "u2",
        authorName: "Bob",
        body: "Reply to old root",
        parentCommentId: "cm_old_root2",
        createdAt: new Date().toISOString(), // reply itself is recent
      }
    );

    await pruneOldComments();
    expect(mockComments.find((c) => c.id === "cm_old_root2")).toBeUndefined();
    expect(mockComments.find((c) => c.id === "cm_old_reply")).toBeUndefined();
  });

  it("commentRetentionCutoff: is approximately 7 days ago", () => {
    const cutoff = commentRetentionCutoff();
    const nowMs = Date.now();
    const diff = nowMs - cutoff.getTime();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(diff).toBeGreaterThanOrEqual(sevenDaysMs - 1000);
    expect(diff).toBeLessThanOrEqual(sevenDaysMs + 1000);
  });
});
