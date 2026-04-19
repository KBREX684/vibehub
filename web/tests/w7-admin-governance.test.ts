import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildOpenApiDocument } from "../src/lib/openapi-spec";
import { decideAdminAiSuggestion, generateAdminAiSuggestion, listAdminAiSuggestions } from "../src/lib/admin-ai";
import { getAdminDashboardSnapshot } from "../src/lib/admin/metrics";
import { listAuditLogs, listMcpInvokeAudits } from "../src/lib/repository";
import {
  mockAdminAiSuggestions,
  mockAgentActionAudits,
  mockAgentConfirmationRequests,
  mockAuditLogs,
  mockMcpInvokeAudits,
  mockPosts,
  mockReportTickets,
  mockTeamDiscussions,
  mockTeamTaskComments,
  mockTeamTasks,
} from "../src/lib/data/mock-data";

const baseState = {
  adminAi: structuredClone(mockAdminAiSuggestions),
  auditLogs: structuredClone(mockAuditLogs),
  mcp: structuredClone(mockMcpInvokeAudits),
  agentAudits: structuredClone(mockAgentActionAudits),
  confirmations: structuredClone(mockAgentConfirmationRequests),
  tasks: structuredClone(mockTeamTasks),
  discussions: structuredClone(mockTeamDiscussions),
  comments: structuredClone(mockTeamTaskComments),
  reports: structuredClone(mockReportTickets),
  posts: structuredClone(mockPosts),
};

function restoreMockArray<T>(target: T[], source: T[]) {
  target.splice(0, target.length, ...structuredClone(source));
}

beforeEach(() => {
  restoreMockArray(mockAdminAiSuggestions, baseState.adminAi);
  restoreMockArray(mockAuditLogs, baseState.auditLogs);
  restoreMockArray(mockMcpInvokeAudits, baseState.mcp);
  restoreMockArray(mockAgentActionAudits, baseState.agentAudits);
  restoreMockArray(mockAgentConfirmationRequests, baseState.confirmations);
  restoreMockArray(mockTeamTasks, baseState.tasks);
  restoreMockArray(mockTeamDiscussions, baseState.discussions);
  restoreMockArray(mockTeamTaskComments, baseState.comments);
  restoreMockArray(mockReportTickets, baseState.reports);
  restoreMockArray(mockPosts, baseState.posts);
});

afterEach(() => {
  restoreMockArray(mockAdminAiSuggestions, baseState.adminAi);
  restoreMockArray(mockAuditLogs, baseState.auditLogs);
  restoreMockArray(mockMcpInvokeAudits, baseState.mcp);
  restoreMockArray(mockAgentActionAudits, baseState.agentAudits);
  restoreMockArray(mockAgentConfirmationRequests, baseState.confirmations);
  restoreMockArray(mockTeamTasks, baseState.tasks);
  restoreMockArray(mockTeamDiscussions, baseState.discussions);
  restoreMockArray(mockTeamTaskComments, baseState.comments);
  restoreMockArray(mockReportTickets, baseState.reports);
  restoreMockArray(mockPosts, baseState.posts);
});

describe("W7 admin AI flows", () => {
  it("generates, upserts, filters, and decides suggestions in mock mode", async () => {
    const report =
      mockReportTickets[0] ??
      {
        id: "report_seed",
        targetType: "post" as const,
        targetId: "post_seed",
        reporterId: "u2",
        reason: "spam and phishing links in comments",
        status: "open" as const,
        createdAt: "2026-04-17T08:00:00.000Z",
      };
    if (!mockReportTickets.find((item) => item.id === report.id)) {
      mockReportTickets.unshift(report);
    }

    const first = await generateAdminAiSuggestion({ task: "summarize_report", targetId: report.id });
    expect(first.targetType).toBe("report_ticket");
    expect(first.targetId).toBe(report.id);
    expect(first.adminDecision).toBe("pending");
    expect(mockAdminAiSuggestions).toHaveLength(1);

    const second = await generateAdminAiSuggestion({ task: "summarize_report", targetId: report.id });
    expect(second.id).toBe(first.id);
    expect(mockAdminAiSuggestions).toHaveLength(1);

    const decided = await decideAdminAiSuggestion({
      suggestionId: first.id,
      adminUserId: "u1",
      decision: "accepted",
      decisionNote: "High-risk queue confirmed by moderator",
    });
    expect(decided.adminDecision).toBe("accepted");
    expect(decided.decisionNote).toContain("High-risk");

    const filtered = await listAdminAiSuggestions({
      targetType: "report_ticket",
      adminDecision: "accepted",
      queue: decided.queue,
      page: 1,
      limit: 20,
    });
    expect(filtered.items).toHaveLength(1);
    expect(filtered.items[0]?.id).toBe(first.id);
  });
});

describe("W7 admin audit filters", () => {
  it("filters audit logs and MCP audits server-side in mock mode", async () => {
    mockAuditLogs.unshift(
      {
        id: "audit_w7_1",
        actorId: "u1",
        agentBindingId: "binding_1",
        action: "report_ticket_resolved",
        entityType: "report_ticket",
        entityId: "report_1",
        createdAt: "2026-04-17T10:00:00.000Z",
        metadata: { status: "closed" },
      },
      {
        id: "audit_w7_2",
        actorId: "u2",
        action: "post_reviewed",
        entityType: "post",
        entityId: "post_1",
        createdAt: "2026-04-16T10:00:00.000Z",
      }
    );

    mockMcpInvokeAudits.unshift(
      {
        id: "mcp_w7_1",
        tool: "search_projects",
        userId: "u1",
        apiKeyId: "key_1",
        agentBindingId: "binding_1",
        httpStatus: 200,
        durationMs: 120,
        createdAt: "2026-04-17T11:00:00.000Z",
      },
      {
        id: "mcp_w7_2",
        tool: "create_project",
        userId: "u1",
        httpStatus: 500,
        errorCode: "INTERNAL",
        createdAt: "2026-04-15T11:00:00.000Z",
      }
    );

    const auditLogs = await listAuditLogs({
      actorId: "u1",
      action: "report_ticket_resolved",
      agentBindingId: "binding_1",
      page: 1,
      limit: 20,
    });
    expect(auditLogs.items).toHaveLength(1);
    expect(auditLogs.items[0]?.id).toBe("audit_w7_1");

    const mcpAudits = await listMcpInvokeAudits({
      tool: "search_projects",
      status: "success",
      agentBindingId: "binding_1",
      page: 1,
      limit: 20,
    });
    expect(mcpAudits.items).toHaveLength(1);
    expect(mcpAudits.items[0]?.id).toBe("mcp_w7_1");
  });
});

describe("W7 dashboard and API contract", () => {
  it("produces the expected dashboard metric groups", async () => {
    mockTeamTasks.unshift({
      id: "task_w7",
      teamId: "team1",
      title: "Prepare release notes",
      status: "doing",
      sortOrder: 1,
      createdByUserId: "u1",
      createdAt: "2026-04-17T09:00:00.000Z",
      updatedAt: "2026-04-17T09:30:00.000Z",
    });
    mockAgentActionAudits.unshift({
      id: "agent_w7",
      actorUserId: "u1",
      agentBindingId: "binding_1",
      teamId: "team1",
      action: "agent_complete_team_task",
      outcome: "succeeded",
      createdAt: "2026-04-17T10:00:00.000Z",
    });
    mockAgentConfirmationRequests.unshift({
      id: "confirm_w7",
      requesterUserId: "u1",
      agentBindingId: "binding_1",
      targetType: "team_task",
      targetId: "task_w7",
      action: "complete",
      payload: {},
      status: "rejected",
      createdAt: "2026-04-17T10:10:00.000Z",
      decidedAt: "2026-04-17T10:12:00.000Z",
    });

    const snapshot = await getAdminDashboardSnapshot(new Date("2026-04-17T12:00:00.000Z"));
    expect(snapshot.northStars).toHaveLength(3);
    expect(snapshot.supportMetrics).toHaveLength(6);
    expect(snapshot.northStars.map((item) => item.key)).toEqual(["wahc", "ao_rate", "agent_rejection_rate"]);
  });

  it("exposes W7 admin routes in OpenAPI", () => {
    const doc = buildOpenApiDocument() as { paths: Record<string, Record<string, unknown>> };
    expect(doc.paths["/api/v1/admin/ai-suggestions"]?.get).toBeDefined();
    expect(doc.paths["/api/v1/admin/ai-suggestions/generate"]?.post).toBeDefined();
    expect(doc.paths["/api/v1/admin/ai-suggestions/{suggestionId}/decision"]?.post).toBeDefined();
    expect(doc.paths["/api/v1/admin/audit-logs"]?.get).toBeDefined();
    expect(doc.paths["/api/v1/admin/mcp-invoke-audits"]?.get).toBeDefined();
  });
});
