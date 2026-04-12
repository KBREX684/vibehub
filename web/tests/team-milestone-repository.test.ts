import { describe, expect, it } from "vitest";
import {
  createTeamMilestone,
  deleteTeamMilestone,
  listTeamMilestones,
  updateTeamMilestone,
} from "../src/lib/repository";

describe("team milestones (P3-5, mock)", () => {
  it("lists milestones for member", async () => {
    const list = await listTeamMilestones({ teamSlug: "vibehub-core", viewerUserId: "u1" });
    expect(list.length).toBeGreaterThan(0);
    expect(list[0].sortOrder).toBeDefined();
  });

  it("rejects non-member", async () => {
    await expect(listTeamMilestones({ teamSlug: "vibehub-core", viewerUserId: "u3" })).rejects.toThrow(
      "FORBIDDEN_NOT_TEAM_MEMBER"
    );
  });

  it("creates updates and deletes", async () => {
    const m = await createTeamMilestone({
      teamSlug: "vibehub-core",
      actorUserId: "u1",
      title: "Beta cut",
      targetDate: new Date(Date.UTC(2026, 8, 1)).toISOString(),
    });
    expect(m.completed).toBe(false);
    const u = await updateTeamMilestone({
      teamSlug: "vibehub-core",
      milestoneId: m.id,
      actorUserId: "u2",
      completed: true,
    });
    expect(u.completed).toBe(true);
    await deleteTeamMilestone({ teamSlug: "vibehub-core", milestoneId: m.id, actorUserId: "u1" });
    const after = await listTeamMilestones({ teamSlug: "vibehub-core", viewerUserId: "u1" });
    expect(after.some((x) => x.id === m.id)).toBe(false);
  });
});
