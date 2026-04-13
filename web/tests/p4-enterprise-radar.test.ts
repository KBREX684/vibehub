import { describe, expect, it } from "vitest";
import { getProjectRadar, getTalentRadar, getProjectDueDiligence } from "../src/lib/repository";

describe("getProjectRadar", () => {
  it("returns projects sorted by score descending", async () => {
    const radar = await getProjectRadar(10);
    expect(radar.length).toBeGreaterThan(0);
    for (let i = 1; i < radar.length; i++) {
      expect(radar[i - 1].score).toBeGreaterThanOrEqual(radar[i].score);
    }
  });

  it("respects limit parameter", async () => {
    const radar = await getProjectRadar(1);
    expect(radar.length).toBeLessThanOrEqual(1);
  });

  it("entries have required fields", async () => {
    const radar = await getProjectRadar(5);
    for (const entry of radar) {
      expect(entry.slug).toBeDefined();
      expect(entry.title).toBeDefined();
      expect(typeof entry.score).toBe("number");
    }
  });
});

describe("getTalentRadar", () => {
  it("returns creators sorted by contribution score descending", async () => {
    const radar = await getTalentRadar(10);
    expect(radar.length).toBeGreaterThan(0);
    for (let i = 1; i < radar.length; i++) {
      expect(radar[i - 1].contributionScore).toBeGreaterThanOrEqual(radar[i].contributionScore);
    }
  });

  it("entries have required fields", async () => {
    const radar = await getTalentRadar(5);
    for (const entry of radar) {
      expect(entry.creatorSlug).toBeDefined();
      expect(entry.headline).toBeDefined();
      expect(typeof entry.contributionScore).toBe("number");
      expect(typeof entry.projectCount).toBe("number");
    }
  });
});

describe("getProjectDueDiligence", () => {
  it("returns due diligence for existing project", async () => {
    const dd = await getProjectDueDiligence("vibehub");
    expect(dd).not.toBeNull();
    expect(dd!.slug).toBe("vibehub");
    expect(dd!.title).toBeDefined();
    expect(dd!.description).toBeDefined();
    expect(typeof dd!.collaborationIntentCount).toBe("number");
    expect(typeof dd!.commentCount).toBe("number");
  });

  it("returns null for non-existent project", async () => {
    const dd = await getProjectDueDiligence("nonexistent");
    expect(dd).toBeNull();
  });

  it("includes team info when project has a team", async () => {
    const dd = await getProjectDueDiligence("vibehub");
    expect(dd).not.toBeNull();
    if (dd!.team) {
      expect(dd!.team.slug).toBeDefined();
      expect(dd!.team.name).toBeDefined();
      expect(typeof dd!.team.memberCount).toBe("number");
    }
  });
});
