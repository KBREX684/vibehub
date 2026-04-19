import { describe, expect, it } from "vitest";
import { getEmbedProjectCard, getEmbedTeamCard } from "../src/lib/repository";

describe("getEmbedProjectCard", () => {
  it("returns embeddable card for existing project", async () => {
    const card = await getEmbedProjectCard("vibehub");
    expect(card).not.toBeNull();
    expect(card!.slug).toBe("vibehub");
    expect(card!.title).toBeDefined();
    expect(card!.vibehubUrl).toBe("/p/vibehub"); // v10/v11 移到 /p/[slug]
  });

  it("returns null for non-existent project", async () => {
    const card = await getEmbedProjectCard("nonexistent");
    expect(card).toBeNull();
  });
});

describe("getEmbedTeamCard", () => {
  it("returns embeddable card for existing team", async () => {
    const card = await getEmbedTeamCard("vibehub-core");
    expect(card).not.toBeNull();
    expect(card!.slug).toBe("vibehub-core");
    expect(card!.name).toBeDefined();
    expect(card!.memberCount).toBeGreaterThan(0);
    expect(card!.vibehubUrl).toBe("/work/team/vibehub-core"); // v10/v11 团队空间 URL
  });

  it("returns null for non-existent team", async () => {
    const card = await getEmbedTeamCard("nonexistent");
    expect(card).toBeNull();
  });
});
