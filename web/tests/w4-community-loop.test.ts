import { describe, expect, it } from "vitest";
import {
  getProjectEngagementSnapshot,
  listProjectFeed,
  listTeamActivityLog,
} from "../src/lib/repository";
import type { Project } from "../src/lib/types";
import {
  mockAgentActionAudits,
  mockAuditLogs,
  mockCollaborationIntents,
  mockProjectBookmarks,
  mockProjects,
} from "../src/lib/data/mock-data";

describe("W4 community flywheel", () => {
  it("ranks hot projects with discovery score and exposes recent bookmark delta", async () => {
    const tempProject: Project = {
      id: "p-w4-hot",
      slug: "w4-hot-project",
      creatorId: "c2",
      title: "W4 Hot Project",
      oneLiner: "Temporary ranking fixture",
      description: "Used to verify W4 hot project scoring.",
      techStack: ["Next.js"],
      tags: ["agent", "ranking"],
      status: "building",
      screenshots: [],
      openSource: true,
      updatedAt: new Date().toISOString(),
      featuredRank: 1,
    };
    mockProjects.unshift(tempProject);
    mockProjectBookmarks.push(
      { id: "pb_w4_1", userId: "u1", projectId: tempProject.id, createdAt: new Date().toISOString() },
      { id: "pb_w4_2", userId: "u2", projectId: tempProject.id, createdAt: new Date().toISOString() },
      { id: "pb_w4_3", userId: "u3", projectId: tempProject.id, createdAt: new Date().toISOString() }
    );
    mockCollaborationIntents.push(
      {
        id: "ci_w4_1",
        projectId: tempProject.id,
        applicantId: "u1",
        intentType: "join",
        message: "I can help with ranking validation.",
        status: "approved",
        convertedToTeamMembership: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: "ci_w4_2",
        projectId: tempProject.id,
        applicantId: "u2",
        intentType: "join",
        message: "I can help with discussion feed QA.",
        status: "pending",
        convertedToTeamMembership: false,
        createdAt: new Date().toISOString(),
      }
    );

    try {
      const feed = await listProjectFeed({ sort: "hot", page: 1, limit: 5 });
      const ranked = feed.items.find((item) => item.slug === tempProject.slug);
      expect(ranked).toBeDefined();
      expect(ranked?.recentBookmarkDelta).toBe(3);
      expect(ranked?.bookmarkCount).toBe(3);
      expect(ranked?.collaborationIntentCount).toBe(2);
      expect((ranked?.activityScore ?? 0) > 0).toBe(true);
    } finally {
      const projectIndex = mockProjects.findIndex((item) => item.id === tempProject.id);
      if (projectIndex >= 0) mockProjects.splice(projectIndex, 1);
      for (const id of ["pb_w4_1", "pb_w4_2", "pb_w4_3"]) {
        const index = mockProjectBookmarks.findIndex((item) => item.id === id);
        if (index >= 0) mockProjectBookmarks.splice(index, 1);
      }
      for (const id of ["ci_w4_1", "ci_w4_2"]) {
        const index = mockCollaborationIntents.findIndex((item) => item.id === id);
        if (index >= 0) mockCollaborationIntents.splice(index, 1);
      }
    }
  });

  it("returns project engagement snapshot with recent bookmarkers and intents", async () => {
    const projectId = "p1";
    mockProjectBookmarks.push(
      { id: "pb_w4_snapshot_1", userId: "u1", projectId, createdAt: new Date().toISOString() },
      { id: "pb_w4_snapshot_2", userId: "u2", projectId, createdAt: new Date().toISOString() }
    );
    try {
      const snapshot = await getProjectEngagementSnapshot({ projectId, viewerUserId: "u1" });
      expect(snapshot.viewerHasBookmarked).toBe(true);
      expect(snapshot.bookmarkCount).toBeGreaterThanOrEqual(2);
      expect(snapshot.recentBookmarkers.some((item) => item.name === "Alice")).toBe(true);
      expect(snapshot.recentBookmarkDelta).toBeGreaterThanOrEqual(2);
    } finally {
      for (const id of ["pb_w4_snapshot_1", "pb_w4_snapshot_2"]) {
        const index = mockProjectBookmarks.findIndex((item) => item.id === id);
        if (index >= 0) mockProjectBookmarks.splice(index, 1);
      }
    }
  });

  it("filters team activity timeline by task, discussion, and agent", async () => {
    mockAuditLogs.unshift(
      {
        id: "log_w4_discussion",
        actorId: "u1",
        action: "team_discussion_created",
        entityType: "team_discussion",
        entityId: "td-w4",
        metadata: { teamId: "team1", discussionTitle: "Release checklist" },
        createdAt: new Date().toISOString(),
      },
      {
        id: "log_w4_task",
        actorId: "u2",
        action: "team_task_updated",
        entityType: "team_task",
        entityId: "tt-w4",
        metadata: { teamId: "team1", taskTitle: "Wire W4 feed" },
        createdAt: new Date().toISOString(),
      }
    );
    mockAgentActionAudits.unshift({
      id: "agent_w4",
      actorUserId: "u1",
      agentBindingId: "ab1",
      teamId: "team1",
      action: "team_task_complete",
      outcome: "succeeded",
      taskId: "tt1",
      createdAt: new Date().toISOString(),
    });

    try {
      const all = await listTeamActivityLog({ teamSlug: "vibehub-core", page: 1, limit: 10, type: "all" });
      const tasks = await listTeamActivityLog({ teamSlug: "vibehub-core", page: 1, limit: 10, type: "task" });
      const discussions = await listTeamActivityLog({ teamSlug: "vibehub-core", page: 1, limit: 10, type: "discussion" });
      const agents = await listTeamActivityLog({ teamSlug: "vibehub-core", page: 1, limit: 10, type: "agent" });

      expect(all.items.some((item) => item.kind === "agent")).toBe(true);
      expect(tasks.items.every((item) => item.kind === "task")).toBe(true);
      expect(discussions.items.every((item) => item.kind === "discussion")).toBe(true);
      expect(agents.items.every((item) => item.kind === "agent")).toBe(true);
    } finally {
      for (const id of ["log_w4_discussion", "log_w4_task"]) {
        const index = mockAuditLogs.findIndex((item) => item.id === id);
        if (index >= 0) mockAuditLogs.splice(index, 1);
      }
      const agentIndex = mockAgentActionAudits.findIndex((item) => item.id === "agent_w4");
      if (agentIndex >= 0) mockAgentActionAudits.splice(agentIndex, 1);
    }
  });
});
