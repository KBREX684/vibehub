import { describe, expect, it } from "vitest";
import {
  createTeamTask,
  deleteTeamTask,
  listTeamTasks,
  updateTeamTask,
} from "../src/lib/repository";

describe("team tasks (P3-4, mock)", () => {
  it("lists tasks for team member", async () => {
    const tasks = await listTeamTasks({ teamSlug: "vibehub-core", viewerUserId: "u1" });
    expect(tasks.length).toBeGreaterThan(0);
  });

  it("rejects list for non-member", async () => {
    await expect(listTeamTasks({ teamSlug: "vibehub-core", viewerUserId: "u3" })).rejects.toThrow(
      "FORBIDDEN_NOT_TEAM_MEMBER"
    );
  });

  it("creates and updates task", async () => {
    const t = await createTeamTask({
      teamSlug: "vibehub-core",
      actorUserId: "u1",
      title: "Integration test task",
      assigneeUserId: "u2",
    });
    expect(t.status).toBe("todo");
    const updated = await updateTeamTask({
      teamSlug: "vibehub-core",
      taskId: t.id,
      actorUserId: "u2",
      status: "done",
    });
    expect(updated.status).toBe("done");
    await deleteTeamTask({ teamSlug: "vibehub-core", taskId: t.id, actorUserId: "u1" });
    const after = await listTeamTasks({ teamSlug: "vibehub-core", viewerUserId: "u1" });
    expect(after.some((x) => x.id === t.id)).toBe(false);
  });

  it("rejects assignee outside team", async () => {
    await expect(
      createTeamTask({
        teamSlug: "vibehub-core",
        actorUserId: "u1",
        title: "Bad assign",
        assigneeUserId: "u3",
      })
    ).rejects.toThrow("ASSIGNEE_NOT_TEAM_MEMBER");
  });
});
