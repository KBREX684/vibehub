import { describe, expect, it } from "vitest";
import { generateEcosystemReport } from "../src/lib/repository";

describe("generateEcosystemReport", () => {
  it("generates a report with current period", async () => {
    const report = await generateEcosystemReport("current");
    expect(report.period).toBe("current");
    expect(report.generatedAt).toBeDefined();
    expect(report.metrics).toBeDefined();
  });

  it("includes all required metric fields", async () => {
    const report = await generateEcosystemReport("2026-Q2");
    const m = report.metrics;
    expect(typeof m.totalUsers).toBe("number");
    expect(typeof m.totalProjects).toBe("number");
    expect(typeof m.totalPosts).toBe("number");
    expect(typeof m.totalComments).toBe("number");
    expect(typeof m.totalTeams).toBe("number");
    expect(typeof m.totalCollaborationIntents).toBe("number");
    expect(typeof m.approvedIntents).toBe("number");
    expect(typeof m.activeChallenge).toBe("number");
    expect(m.totalUsers).toBeGreaterThan(0);
  });

  it("includes top lists", async () => {
    const report = await generateEcosystemReport("current");
    expect(Array.isArray(report.metrics.topProjectsByIntents)).toBe(true);
    expect(Array.isArray(report.metrics.topDiscussionsByComments)).toBe(true);
    expect(Array.isArray(report.metrics.topCreatorsByScore)).toBe(true);
  });

  it("top projects have slug and count", async () => {
    const report = await generateEcosystemReport("current");
    for (const p of report.metrics.topProjectsByIntents) {
      expect(p.slug).toBeDefined();
      expect(typeof p.count).toBe("number");
    }
  });
});
