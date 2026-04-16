import { describe, expect, it } from "vitest";
import {
  addTeamMemberByEmail,
  agentCompleteTeamTask,
  batchUpdateTeamTasks,
  createTeam,
  createTeamTask,
  createAgentBindingForUser,
  deleteTeamTask,
  decideAgentConfirmationRequest,
  listTeamTasks,
  listAgentActionAuditsForUser,
  listAgentConfirmationRequestsForUser,
  reorderTeamTask,
  requestAgentTaskDelete,
  requestAgentTaskReview,
  requestAgentTeamMemberRoleChange,
  updateTeamMemberRole,
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

  it("reviewer may update and batch-review tasks without owner privileges", async () => {
    const team = await createTeam({ ownerUserId: "u1", name: "Reviewer Flow Team" });
    await addTeamMemberByEmail({
      teamSlug: team.slug,
      actorUserId: "u1",
      email: "chen@vibehub.dev",
      role: "reviewer",
    });
    const task = await createTeamTask({
      teamSlug: team.slug,
      actorUserId: "u1",
      title: "Reviewer can triage this",
    });
    const updated = await updateTeamTask({
      teamSlug: team.slug,
      taskId: task.id,
      actorUserId: "u3",
      status: "doing",
    });
    expect(updated.status).toBe("doing");
    const batch = await batchUpdateTeamTasks({
      teamSlug: team.slug,
      actorUserId: "u3",
      taskIds: [task.id],
      status: "done",
    });
    expect(batch[0]?.status).toBe("done");
  });

  it("agent completion moves task into review and records independent audit", async () => {
    const binding = await createAgentBindingForUser({
      userId: "u2",
      label: "Member agent",
      agentType: "openai",
    });
    const created = await createTeamTask({
      teamSlug: "vibehub-core",
      actorUserId: "u1",
      title: "Agent-completed task",
      assigneeUserId: "u2",
    });
    const reviewed = await agentCompleteTeamTask({
      teamSlug: "vibehub-core",
      taskId: created.id,
      actorUserId: "u2",
      agentBindingId: binding.id,
    });
    expect(reviewed.status).toBe("review");
    expect(reviewed.reviewRequestedAt).toBeTruthy();
    const audits = await listAgentActionAuditsForUser({ userId: "u2", page: 1, limit: 20 });
    expect(audits.items.some((item) => item.action === "team_task_complete" && item.taskId === created.id)).toBe(true);
  });

  it("reviewer agent review requires human confirmation, then marks task done", async () => {
    const team = await createTeam({ ownerUserId: "u1", name: "Agent Review Flow Team" });
    await addTeamMemberByEmail({
      teamSlug: team.slug,
      actorUserId: "u1",
      email: "bob@vibehub.dev",
      role: "member",
    });
    await addTeamMemberByEmail({
      teamSlug: team.slug,
      actorUserId: "u1",
      email: "chen@vibehub.dev",
      role: "reviewer",
    });
    const task = await createTeamTask({
      teamSlug: team.slug,
      actorUserId: "u1",
      title: "Needs reviewer confirmation",
      assigneeUserId: "u2",
    });
    const memberBinding = await createAgentBindingForUser({
      userId: "u2",
      label: "Member finisher",
      agentType: "openai",
    });
    const reviewerBinding = await createAgentBindingForUser({
      userId: "u3",
      label: "Reviewer agent",
      agentType: "openai",
    });
    await agentCompleteTeamTask({
      teamSlug: team.slug,
      taskId: task.id,
      actorUserId: "u2",
      agentBindingId: memberBinding.id,
    });
    const confirmation = await requestAgentTaskReview({
      teamSlug: team.slug,
      taskId: task.id,
      actorUserId: "u3",
      agentBindingId: reviewerBinding.id,
      approved: true,
      reviewNote: "Looks good. Ship it.",
    });
    expect(confirmation.status).toBe("pending");
    const pending = await listAgentConfirmationRequestsForUser({
      userId: "u1",
      page: 1,
      limit: 20,
      status: "pending",
    });
    expect(pending.items.some((item) => item.id === confirmation.id)).toBe(true);
    const decided = await decideAgentConfirmationRequest({
      requestId: confirmation.id,
      deciderUserId: "u1",
      decision: "approved",
    });
    expect(decided.status).toBe("approved");
    const tasks = await listTeamTasks({ teamSlug: team.slug, viewerUserId: "u1" });
    const updated = tasks.find((item) => item.id === task.id);
    expect(updated?.status).toBe("done");
    expect(updated?.reviewedByUserId).toBe("u1");
  });

  it("agent high-risk delete and role change require confirmation before applying", async () => {
    const team = await createTeam({ ownerUserId: "u1", name: "Agent High Risk Team" });
    await addTeamMemberByEmail({
      teamSlug: team.slug,
      actorUserId: "u1",
      email: "bob@vibehub.dev",
      role: "member",
    });
    const ownerAgent = await createAgentBindingForUser({
      userId: "u1",
      label: "Owner ops agent",
      agentType: "openai",
    });
    const task = await createTeamTask({
      teamSlug: team.slug,
      actorUserId: "u1",
      title: "Delete me after confirmation",
    });
    const deleteRequest = await requestAgentTaskDelete({
      teamSlug: team.slug,
      taskId: task.id,
      actorUserId: "u1",
      agentBindingId: ownerAgent.id,
      reason: "obsolete task",
    });
    await decideAgentConfirmationRequest({
      requestId: deleteRequest.id,
      deciderUserId: "u1",
      decision: "approved",
    });
    const remaining = await listTeamTasks({ teamSlug: team.slug, viewerUserId: "u1" });
    expect(remaining.some((item) => item.id === task.id)).toBe(false);

    const roleRequest = await requestAgentTeamMemberRoleChange({
      teamSlug: team.slug,
      memberUserId: "u2",
      nextRole: "reviewer",
      actorUserId: "u1",
      agentBindingId: ownerAgent.id,
      reason: "shift to review duty",
    });
    await decideAgentConfirmationRequest({
      requestId: roleRequest.id,
      deciderUserId: "u1",
      decision: "approved",
    });
    const noop = await updateTeamMemberRole({
      teamSlug: team.slug,
      actorUserId: "u1",
      memberUserId: "u2",
      role: "reviewer",
    });
    expect(noop.role).toBe("reviewer");
  });
});
