import { describe, expect, it } from "vitest";
import {
  createTeamMilestone,
  createTeamTask,
  deleteTeamMilestone,
  deleteTeamTask,
  listTeamMilestones,
  listTeamTasks,
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
      actorUserId: "u1",
      completed: true,
    });
    expect(u.completed).toBe(true);
    await deleteTeamMilestone({ teamSlug: "vibehub-core", milestoneId: m.id, actorUserId: "u1" });
    const after = await listTeamMilestones({ teamSlug: "vibehub-core", viewerUserId: "u1" });
    expect(after.some((x) => x.id === m.id)).toBe(false);
  });

  it("rejects milestone create for non-owner member", async () => {
    await expect(
      createTeamMilestone({
        teamSlug: "vibehub-core",
        actorUserId: "u2",
        title: "Member should not create",
        targetDate: new Date(Date.UTC(2026, 10, 1)).toISOString(),
      })
    ).rejects.toThrow("FORBIDDEN_NOT_TEAM_OWNER");
  });

  it("allows member to update progress only", async () => {
    const m = await createTeamMilestone({
      teamSlug: "vibehub-core",
      actorUserId: "u1",
      title: "Progress test milestone",
      targetDate: new Date(Date.UTC(2026, 11, 1)).toISOString(),
    });
    const updated = await updateTeamMilestone({
      teamSlug: "vibehub-core",
      milestoneId: m.id,
      actorUserId: "u2",
      progress: 42,
    });
    expect(updated.progress).toBe(42);
    await deleteTeamMilestone({ teamSlug: "vibehub-core", milestoneId: m.id, actorUserId: "u1" });
  });

  it("rejects member structural edits (title/description/etc)", async () => {
    const m = await createTeamMilestone({
      teamSlug: "vibehub-core",
      actorUserId: "u1",
      title: "Owner milestone",
      targetDate: new Date(Date.UTC(2026, 11, 15)).toISOString(),
    });
    await expect(
      updateTeamMilestone({
        teamSlug: "vibehub-core",
        milestoneId: m.id,
        actorUserId: "u2",
        title: "member cannot rename",
      })
    ).rejects.toThrow("FORBIDDEN_MILESTONE_MEMBER_EDIT");
    await deleteTeamMilestone({ teamSlug: "vibehub-core", milestoneId: m.id, actorUserId: "u1" });
  });

  it("clears task milestoneId when milestone is deleted", async () => {
    const m = await createTeamMilestone({
      teamSlug: "vibehub-core",
      actorUserId: "u1",
      title: "Temp milestone for task link",
      targetDate: new Date(Date.UTC(2026, 9, 1)).toISOString(),
    });
    const task = await createTeamTask({
      teamSlug: "vibehub-core",
      actorUserId: "u1",
      title: "Task under temp milestone",
      milestoneId: m.id,
    });
    expect(task.milestoneId).toBe(m.id);
    await deleteTeamMilestone({ teamSlug: "vibehub-core", milestoneId: m.id, actorUserId: "u1" });
    const tasks = await listTeamTasks({ teamSlug: "vibehub-core", viewerUserId: "u1" });
    const row = tasks.find((x) => x.id === task.id);
    expect(row?.milestoneId).toBeUndefined();
    await deleteTeamTask({ teamSlug: "vibehub-core", taskId: task.id, actorUserId: "u1" });
  });
});
