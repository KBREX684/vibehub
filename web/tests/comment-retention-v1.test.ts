import { describe, it, expect } from "vitest";
import { commentRetentionCutoff, pruneOldComments } from "../src/lib/repository";
import { mockComments } from "../src/lib/data/mock-data";

describe("Comment retention — long-term default (v1.1 fix)", () => {
  it("commentRetentionCutoff returns epoch-0 when COMMENT_RETAIN_DAYS=0 (default)", () => {
    // Default env is 0 (disabled)
    const cutoff = commentRetentionCutoff();
    expect(cutoff.getTime()).toBe(0);
  });

  it("pruneOldComments returns 0 when retention is disabled", async () => {
    // No real comments should be deleted with default disabled retention
    const deleted = await pruneOldComments();
    expect(deleted).toBe(0);
  });

  it("existing mock comments survive a prune call", async () => {
    const before = mockComments.length;
    await pruneOldComments();
    expect(mockComments.length).toBe(before);
  });
});
