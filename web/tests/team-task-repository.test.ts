import { describe, expect, it } from "vitest";
import {
  createTeamTask,
  deleteTeamTask,
  listTeamTasks,
  reorderTeamTask,
  updateTeamTask,
} from "../src/lib/repository";
import type { TeamTask } from "../src/lib/types";

describe("team tasks (P3-4 + P3-7, mock)", () => {
  it("lists tasks for team member", async () => {
    const tasks = await listTeamTasks({ teamSlug: "vibehub-core", viewerUserId: "u1" });
    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks.every((x) => typeof x.sortOrder === "number")).toBe(true);
    const linked = tasks.find((x) => x.id === "tt1");
    expect(linked?.milestoneId).toBe("ms1");
    expect(linked?.milestoneTitle).toBeTruthy();
  });

  it("creates and updates milestone link", async () => {
    const t = await createTeamTask({
      teamSlug: "vibehub-core",
      actorUserId: "u1",
      title: "Milestone-linked task",
      milestoneId: "ms2",
    });
    expect(t.milestoneId).toBe("ms2");
    expect(t.milestoneTitle).toBeTruthy();
    const cleared = await updateTeamTask({
      teamSlug: "vibehub-core",
      taskId: t.id,
      actorUserId: "u1",
      milestoneId: null,
    });
    expect(cleared.milestoneId).toBeUndefined();
    await deleteTeamTask({ teamSlug: "vibehub-core", taskId: t.id, actorUserId: "u1" });
  });

  it("rejects milestone from another team or unknown id", async () => {
    await expect(
      createTeamTask({
        teamSlug: "vibehub-core",
        actorUserId: "u1",
        title: "Bad milestone",
        milestoneId: "not-a-real-milestone",
      })
    ).rejects.toThrow("TEAM_MILESTONE_NOT_FOUND");
  });

  it("reorders tasks within the same status column (swap sortOrder)", async () => {
    const a = await createTeamTask({
      teamSlug: "vibehub-core",
      actorUserId: "u1",
      title: "Reorder column pair A",
    });
    const b = await createTeamTask({
      teamSlug: "vibehub-core",
      actorUserId: "u1",
      title: "Reorder column pair B",
    });
    expect(a.status).toBe("todo");
    expect(b.status).toBe("todo");
    const sortTodos = (rows: TeamTask[]) =>
      [...rows].filter((t) => t.status === "todo").sort((x, y) => x.sortOrder - y.sortOrder || y.updatedAt.localeCompare(x.updatedAt));
    const before = sortTodos(await listTeamTasks({ teamSlug: "vibehub-core", viewerUserId: "u1" }));
    const iB = before.findIndex((t) => t.id === b.id);
    expect(iB).toBeGreaterThan(0);
    await reorderTeamTask({
      teamSlug: "vibehub-core",
      taskId: b.id,
      actorUserId: "u1",
      direction: "up",
    });
    const after = sortTodos(await listTeamTasks({ teamSlug: "vibehub-core", viewerUserId: "u1" }));
    expect(after.findIndex((t) => t.id === b.id)).toBe(iB - 1);
    await reorderTeamTask({
      teamSlug: "vibehub-core",
      taskId: b.id,
      actorUserId: "u1",
      direction: "down",
    });
    await deleteTeamTask({ teamSlug: "vibehub-core", taskId: a.id, actorUserId: "u1" });
    await deleteTeamTask({ teamSlug: "vibehub-core", taskId: b.id, actorUserId: "u1" });
  });

  it("rejects list for non-member", async () => {
    await expect(listTeamTasks({ teamSlug: "vibehub-core", viewerUserId: "u99" })).rejects.toThrow(
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

  it("member may update only own-created or assigned tasks; owner may update any", async () => {
    await expect(
      updateTeamTask({
        teamSlug: "vibehub-core",
        taskId: "tt2",
        actorUserId: "u2",
        title: "Hijack",
      })
    ).rejects.toThrow("FORBIDDEN_TASK_UPDATE");
    const asAssignee = await updateTeamTask({
      teamSlug: "vibehub-core",
      taskId: "tt1",
      actorUserId: "u2",
      status: "done",
    });
    expect(asAssignee.status).toBe("done");
    await updateTeamTask({
      teamSlug: "vibehub-core",
      taskId: "tt1",
      actorUserId: "u1",
      status: "doing",
    });
  });

  it("only creator or team owner may delete a task", async () => {
    await expect(
      deleteTeamTask({ teamSlug: "vibehub-core", taskId: "tt2", actorUserId: "u2" })
    ).rejects.toThrow("FORBIDDEN_TASK_DELETE");
    await deleteTeamTask({ teamSlug: "vibehub-core", taskId: "tt2", actorUserId: "u1" });
    const tasks = await listTeamTasks({ teamSlug: "vibehub-core", viewerUserId: "u1" });
    expect(tasks.some((t) => t.id === "tt2")).toBe(false);
  });
});
