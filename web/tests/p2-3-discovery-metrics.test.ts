import { describe, expect, it } from "vitest";
import {
  getCollaborationIntentConversionMetrics,
  getDiscussionLeaderboard,
  getProjectCollaborationLeaderboard,
  getTopicDiscovery,
  listCollectionTopics,
} from "../src/lib/repository";

describe("P2-3 collection topics and leaderboards", () => {
  it("should list configured collection topics", () => {
    const topics = listCollectionTopics();
    expect(topics.length).toBeGreaterThan(0);
    expect(topics.some((t) => t.slug === "agent-native")).toBe(true);
  });

  it("should resolve topic discovery with posts and projects filtered by tag", async () => {
    const discovery = await getTopicDiscovery("agent-native");
    expect(discovery).not.toBeNull();
    expect(discovery?.topic.tag).toBe("agent");
    expect(discovery?.posts.items.every((p) => p.tags.includes("agent"))).toBe(true);
    expect(discovery?.projects.items.every((p) => p.tags.includes("agent"))).toBe(true);
  });

  it("should rank discussions by comment count", async () => {
    const rows = await getDiscussionLeaderboard(10);
    expect(rows.length).toBeGreaterThan(0);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1].commentCount).toBeGreaterThanOrEqual(rows[i].commentCount);
    }
    const top = rows[0];
    expect(top.slug).toBe("weekly-vibecoding-stack-review");
    expect(top.commentCount).toBe(2);
  });

  it("should rank projects by collaboration intent count", async () => {
    const rows = await getProjectCollaborationLeaderboard(10);
    expect(rows.length).toBeGreaterThan(0);
    const p2 = rows.find((r) => r.slug === "prompt-lab");
    const p1 = rows.find((r) => r.slug === "vibehub");
    expect(p2?.intentCount).toBe(1);
    expect(p1?.intentCount).toBe(1);
  });

  it("should compute collaboration intent funnel metrics", async () => {
    const m = await getCollaborationIntentConversionMetrics();
    expect(m.totalSubmissions).toBeGreaterThan(0);
    expect(m.pending + m.approved + m.rejected).toBe(m.totalSubmissions);
    expect(m.approvalRate).toBeGreaterThanOrEqual(0);
    expect(m.approvalRate).toBeLessThanOrEqual(1);
  });
});
