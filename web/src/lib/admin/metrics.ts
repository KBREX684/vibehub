import { prisma } from "@/lib/db";
import { isMockDataEnabled } from "@/lib/runtime-mode";
import {
  mockAgentActionAudits,
  mockAgentConfirmationRequests,
  mockAuditLogs,
  mockPosts,
  mockProjects,
  mockReportTickets,
  mockTeamDiscussions,
  mockTeamMilestones,
  mockTeamTaskComments,
  mockTeamTasks,
  mockUserSubscriptions,
  mockUsers,
} from "@/lib/data/mock-data";
import type { AdminDashboardMetric, AdminDashboardSnapshot } from "@/lib/types";

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function buildWindow(now = new Date()) {
  const today = startOfUtcDay(now);
  const currentStart = addUtcDays(today, -6);
  const previousStart = addUtcDays(currentStart, -7);
  return {
    now,
    currentStart,
    previousStart,
    previousEnd: currentStart,
  };
}

function toIsoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buildLastSevenDayKeys(now = new Date()): string[] {
  const today = startOfUtcDay(now);
  return Array.from({ length: 7 }, (_, index) => toIsoDay(addUtcDays(today, index - 6)));
}

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function inRange(value: string | Date | null | undefined, start: Date, end: Date): boolean {
  const date = toDate(value);
  if (!date) return false;
  return date >= start && date < end;
}

function percentageDelta(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function roundMetric(value: number): number {
  return Number(value.toFixed(1));
}

function countDistinctPerDay<T>(rows: T[], getDate: (row: T) => string | Date | null | undefined, getKey: (row: T) => string, now = new Date()): number[] {
  const keys = buildLastSevenDayKeys(now);
  const buckets = new Map<string, Set<string>>(keys.map((key) => [key, new Set<string>()]));
  for (const row of rows) {
    const date = toDate(getDate(row));
    if (!date) continue;
    const bucket = buckets.get(toIsoDay(startOfUtcDay(date)));
    if (!bucket) continue;
    bucket.add(getKey(row));
  }
  return keys.map((key) => buckets.get(key)?.size ?? 0);
}

function countPerDay<T>(rows: T[], getDate: (row: T) => string | Date | null | undefined, now = new Date()): number[] {
  const keys = buildLastSevenDayKeys(now);
  const buckets = new Map<string, number>(keys.map((key) => [key, 0]));
  for (const row of rows) {
    const date = toDate(getDate(row));
    if (!date) continue;
    const key = toIsoDay(startOfUtcDay(date));
    if (!buckets.has(key)) continue;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return keys.map((key) => buckets.get(key) ?? 0);
}

function countIntersectionTeams(
  humanRows: Array<{ teamId?: string | null; createdAt?: string | Date | null; updatedAt?: string | Date | null }>,
  agentRows: Array<{ teamId?: string | null; createdAt?: string | Date | null }>,
  start: Date,
  end: Date
): number {
  const humanTeams = new Set(
    humanRows
      .filter((row) => row.teamId && (inRange(row.updatedAt ?? row.createdAt, start, end) || inRange(row.createdAt, start, end)))
      .map((row) => row.teamId as string)
  );
  const agentTeams = new Set(
    agentRows
      .filter((row) => row.teamId && inRange(row.createdAt, start, end))
      .map((row) => row.teamId as string)
  );
  let count = 0;
  for (const teamId of humanTeams) {
    if (agentTeams.has(teamId)) count += 1;
  }
  return count;
}

function buildMetric(input: {
  key: AdminDashboardMetric["key"];
  label: string;
  description: string;
  value: number;
  previousValue: number;
  sparkline: number[];
}): AdminDashboardMetric {
  return {
    key: input.key,
    label: input.label,
    description: input.description,
    value: roundMetric(input.value),
    delta7d: percentageDelta(input.value, input.previousValue),
    sparkline: input.sparkline.map((value) => roundMetric(value)),
  };
}

function getCreatedLike(row: unknown): string | Date | null | undefined {
  if (!row || typeof row !== "object") return undefined;
  const candidate = row as Record<string, string | Date | null | undefined>;
  return candidate.createdAt ?? candidate.updatedAt ?? candidate.currentPeriodStart;
}

function buildOpenReportsSparkline(
  tickets: Array<{ createdAt: string | Date; resolvedAt?: string | Date | null }>,
  now = new Date()
): number[] {
  return buildLastSevenDayKeys(now).map((key) => {
    const end = addUtcDays(new Date(`${key}T00:00:00.000Z`), 1);
    return tickets.filter((ticket) => {
      const createdAt = toDate(ticket.createdAt);
      const resolvedAt = toDate(ticket.resolvedAt);
      if (!createdAt || createdAt >= end) return false;
      return !resolvedAt || resolvedAt >= end;
    }).length;
  });
}

function buildActiveSubscriptionsSparkline(
  subscriptions: Array<{
    createdAt: string | Date;
    tier: string;
    status: string;
    currentPeriodEnd?: string | Date | null;
  }>,
  now = new Date()
): number[] {
  return buildLastSevenDayKeys(now).map((key) => {
    const end = addUtcDays(new Date(`${key}T00:00:00.000Z`), 1);
    return subscriptions.filter((subscription) => {
      const createdAt = toDate(subscription.createdAt);
      const currentPeriodEnd = toDate(subscription.currentPeriodEnd);
      if (!createdAt || createdAt >= end) return false;
      if (subscription.tier !== "pro") return false;
      if (!["active", "trialing"].includes(subscription.status)) return false;
      return !currentPeriodEnd || currentPeriodEnd >= end;
    }).length;
  });
}

export async function getAdminDashboardSnapshot(now = new Date()): Promise<AdminDashboardSnapshot> {
  const window = buildWindow(now);

  if (isMockDataEnabled()) {
    const humanRows = [...mockTeamTasks, ...mockTeamDiscussions, ...mockTeamTaskComments, ...mockTeamMilestones];
    const currentWahc = countIntersectionTeams(humanRows, mockAgentActionAudits, window.currentStart, window.now);
    const previousWahc = countIntersectionTeams(humanRows, mockAgentActionAudits, window.previousStart, window.previousEnd);
    const currentHumanActions = humanRows.filter((row) => inRange(row.updatedAt ?? row.createdAt, window.currentStart, window.now) || inRange(row.createdAt, window.currentStart, window.now)).length;
    const previousHumanActions = humanRows.filter((row) => inRange(row.updatedAt ?? row.createdAt, window.previousStart, window.previousEnd) || inRange(row.createdAt, window.previousStart, window.previousEnd)).length;
    const currentAgentActions = mockAgentActionAudits.filter((row) => inRange(row.createdAt, window.currentStart, window.now)).length;
    const previousAgentActions = mockAgentActionAudits.filter((row) => inRange(row.createdAt, window.previousStart, window.previousEnd)).length;
    const currentAo = currentHumanActions + currentAgentActions === 0 ? 0 : (currentAgentActions / (currentHumanActions + currentAgentActions)) * 100;
    const previousAo = previousHumanActions + previousAgentActions === 0 ? 0 : (previousAgentActions / (previousHumanActions + previousAgentActions)) * 100;
    const currentRejections = mockAgentConfirmationRequests.filter((row) => row.status === "rejected" && inRange(row.decidedAt ?? row.createdAt, window.currentStart, window.now)).length;
    const currentDecided = mockAgentConfirmationRequests.filter((row) => row.status !== "pending" && inRange(row.decidedAt ?? row.createdAt, window.currentStart, window.now)).length;
    const previousRejections = mockAgentConfirmationRequests.filter((row) => row.status === "rejected" && inRange(row.decidedAt ?? row.createdAt, window.previousStart, window.previousEnd)).length;
    const previousDecided = mockAgentConfirmationRequests.filter((row) => row.status !== "pending" && inRange(row.decidedAt ?? row.createdAt, window.previousStart, window.previousEnd)).length;
    const currentRejectionRate = currentDecided === 0 ? 0 : (currentRejections / currentDecided) * 100;
    const previousRejectionRate = previousDecided === 0 ? 0 : (previousRejections / previousDecided) * 100;
    const dauSparkline = countDistinctPerDay(mockAuditLogs, (row) => row.createdAt, (row) => row.actorId, now);
    const previousDauSparkline = countDistinctPerDay(
      mockAuditLogs.filter((row) => inRange(row.createdAt, window.previousStart, window.previousEnd)),
      (row) => row.createdAt,
      (row) => row.actorId,
      addUtcDays(window.previousEnd, -1)
    );

    return {
      generatedAt: now.toISOString(),
      northStars: [
        buildMetric({
          key: "wahc",
          label: "WAHC",
          description: "Weekly active human+agent collaboration teams.",
          value: currentWahc,
          previousValue: previousWahc,
          sparkline: buildLastSevenDayKeys(now).map((key) => countIntersectionTeams(humanRows, mockAgentActionAudits, new Date(`${key}T00:00:00.000Z`), addUtcDays(new Date(`${key}T00:00:00.000Z`), 1))),
        }),
        buildMetric({
          key: "ao_rate",
          label: "AO%",
          description: "Share of collaboration actions with agent participation in the last 7 days.",
          value: currentAo,
          previousValue: previousAo,
          sparkline: buildLastSevenDayKeys(now).map((key) => {
            const start = new Date(`${key}T00:00:00.000Z`);
            const end = addUtcDays(start, 1);
            const human = humanRows.filter((row) => inRange(row.createdAt, start, end) || inRange(row.updatedAt, start, end)).length;
            const agent = mockAgentActionAudits.filter((row) => inRange(row.createdAt, start, end)).length;
            return human + agent === 0 ? 0 : (agent / (human + agent)) * 100;
          }),
        }),
        buildMetric({
          key: "agent_rejection_rate",
          label: "Agent rejection rate",
          description: "Rejected agent confirmations versus all decided confirmations in the last 7 days.",
          value: currentRejectionRate,
          previousValue: previousRejectionRate,
          sparkline: buildLastSevenDayKeys(now).map((key) => {
            const start = new Date(`${key}T00:00:00.000Z`);
            const end = addUtcDays(start, 1);
            const rejected = mockAgentConfirmationRequests.filter((row) => row.status === "rejected" && inRange(row.decidedAt ?? row.createdAt, start, end)).length;
            const decided = mockAgentConfirmationRequests.filter((row) => row.status !== "pending" && inRange(row.decidedAt ?? row.createdAt, start, end)).length;
            return decided === 0 ? 0 : (rejected / decided) * 100;
          }),
        }),
      ],
      supportMetrics: [
        buildMetric({
          key: "dau",
          label: "DAU",
          description: "Distinct active users per day from audit logs.",
          value: dauSparkline.at(-1) ?? 0,
          previousValue: previousDauSparkline.at(-1) ?? 0,
          sparkline: dauSparkline,
        }),
      buildMetric({
        key: "new_users",
        label: "New users",
        description: "Users created in the last 7 days.",
        value: mockUsers.filter((row) => inRange(getCreatedLike(row), window.currentStart, window.now)).length,
        previousValue: mockUsers.filter((row) => inRange(getCreatedLike(row), window.previousStart, window.previousEnd)).length,
        sparkline: countPerDay(mockUsers, (row) => getCreatedLike(row), now),
      }),
        buildMetric({
          key: "new_posts",
          label: "New posts",
          description: "Posts created in the last 7 days.",
          value: mockPosts.filter((row) => inRange(row.createdAt, window.currentStart, window.now)).length,
          previousValue: mockPosts.filter((row) => inRange(row.createdAt, window.previousStart, window.previousEnd)).length,
          sparkline: countPerDay(mockPosts, (row) => row.createdAt, now),
        }),
        buildMetric({
        key: "new_projects",
        label: "New projects",
        description: "Projects created in the last 7 days.",
        value: mockProjects.filter((row) => inRange(getCreatedLike(row), window.currentStart, window.now)).length,
        previousValue: mockProjects.filter((row) => inRange(getCreatedLike(row), window.previousStart, window.previousEnd)).length,
        sparkline: countPerDay(mockProjects, (row) => getCreatedLike(row), now),
      }),
      buildMetric({
        key: "active_subscriptions",
        label: "Active subscriptions",
        description: "Current active or trialing Pro subscriptions.",
        value: buildActiveSubscriptionsSparkline(
          mockUserSubscriptions.map((row) => ({
            createdAt: row.currentPeriodStart,
            currentPeriodEnd: row.currentPeriodEnd,
            status: row.status,
            tier: row.plan.tier,
          })),
          now
        ).at(-1) ?? 0,
        previousValue: buildActiveSubscriptionsSparkline(
          mockUserSubscriptions.map((row) => ({
            createdAt: row.currentPeriodStart,
            currentPeriodEnd: row.currentPeriodEnd,
            status: row.status,
            tier: row.plan.tier,
          })),
          addUtcDays(now, -7)
        ).at(-1) ?? 0,
        sparkline: buildActiveSubscriptionsSparkline(
          mockUserSubscriptions.map((row) => ({
            createdAt: row.currentPeriodStart,
            currentPeriodEnd: row.currentPeriodEnd,
            status: row.status,
            tier: row.plan.tier,
          })),
          now
        ),
      }),
        buildMetric({
          key: "open_reports",
          label: "Open reports",
          description: "Current report queue size.",
          value: buildOpenReportsSparkline(mockReportTickets, now).at(-1) ?? 0,
          previousValue: buildOpenReportsSparkline(mockReportTickets, addUtcDays(now, -7)).at(-1) ?? 0,
          sparkline: buildOpenReportsSparkline(mockReportTickets, now),
        }),
      ],
    };
  }

  const fourteenDaysAgo = addUtcDays(window.currentStart, -7);
  const [agentActions, confirmations, auditLogs, tasks, discussions, comments, milestones, users, posts, projects, subscriptions, reports] = await Promise.all([
    prisma.agentActionAudit.findMany({ where: { createdAt: { gte: fourteenDaysAgo } }, select: { teamId: true, createdAt: true } }),
    prisma.agentConfirmationRequest.findMany({ where: { createdAt: { gte: fourteenDaysAgo } }, select: { status: true, createdAt: true, decidedAt: true } }),
    prisma.auditLog.findMany({ where: { createdAt: { gte: fourteenDaysAgo } }, select: { actorId: true, createdAt: true } }),
    prisma.teamTask.findMany({ where: { OR: [{ createdAt: { gte: fourteenDaysAgo } }, { updatedAt: { gte: fourteenDaysAgo } }] }, select: { teamId: true, createdAt: true, updatedAt: true } }),
    prisma.teamDiscussion.findMany({ where: { OR: [{ createdAt: { gte: fourteenDaysAgo } }, { updatedAt: { gte: fourteenDaysAgo } }] }, select: { teamId: true, createdAt: true, updatedAt: true } }),
    prisma.teamTaskComment.findMany({ where: { OR: [{ createdAt: { gte: fourteenDaysAgo } }, { updatedAt: { gte: fourteenDaysAgo } }] }, select: { teamId: true, createdAt: true, updatedAt: true } }),
    prisma.teamMilestone.findMany({ where: { OR: [{ createdAt: { gte: fourteenDaysAgo } }, { updatedAt: { gte: fourteenDaysAgo } }] }, select: { teamId: true, createdAt: true, updatedAt: true } }),
    prisma.user.findMany({ where: { createdAt: { gte: fourteenDaysAgo } }, select: { createdAt: true } }),
    prisma.post.findMany({ where: { createdAt: { gte: fourteenDaysAgo } }, select: { createdAt: true } }),
    prisma.project.findMany({ where: { createdAt: { gte: fourteenDaysAgo } }, select: { createdAt: true } }),
    prisma.userSubscription.findMany({ select: { tier: true, status: true, currentPeriodEnd: true, createdAt: true } }),
    prisma.reportTicket.findMany({ where: { OR: [{ createdAt: { gte: fourteenDaysAgo } }, { resolvedAt: { gte: fourteenDaysAgo } }, { status: "open" }] }, select: { createdAt: true, resolvedAt: true } }),
  ]);

  const humanRows = [...tasks, ...discussions, ...comments, ...milestones];
  const currentWahc = countIntersectionTeams(humanRows, agentActions, window.currentStart, window.now);
  const previousWahc = countIntersectionTeams(humanRows, agentActions, window.previousStart, window.previousEnd);
  const currentHumanActions = humanRows.filter((row) => inRange(row.updatedAt ?? row.createdAt, window.currentStart, window.now) || inRange(row.createdAt, window.currentStart, window.now)).length;
  const previousHumanActions = humanRows.filter((row) => inRange(row.updatedAt ?? row.createdAt, window.previousStart, window.previousEnd) || inRange(row.createdAt, window.previousStart, window.previousEnd)).length;
  const currentAgentActions = agentActions.filter((row) => inRange(row.createdAt, window.currentStart, window.now)).length;
  const previousAgentActions = agentActions.filter((row) => inRange(row.createdAt, window.previousStart, window.previousEnd)).length;
  const currentAo = currentHumanActions + currentAgentActions === 0 ? 0 : (currentAgentActions / (currentHumanActions + currentAgentActions)) * 100;
  const previousAo = previousHumanActions + previousAgentActions === 0 ? 0 : (previousAgentActions / (previousHumanActions + previousAgentActions)) * 100;
  const currentRejections = confirmations.filter((row) => row.status === "rejected" && inRange(row.decidedAt ?? row.createdAt, window.currentStart, window.now)).length;
  const currentDecided = confirmations.filter((row) => row.status !== "pending" && inRange(row.decidedAt ?? row.createdAt, window.currentStart, window.now)).length;
  const previousRejections = confirmations.filter((row) => row.status === "rejected" && inRange(row.decidedAt ?? row.createdAt, window.previousStart, window.previousEnd)).length;
  const previousDecided = confirmations.filter((row) => row.status !== "pending" && inRange(row.decidedAt ?? row.createdAt, window.previousStart, window.previousEnd)).length;
  const currentRejectionRate = currentDecided === 0 ? 0 : (currentRejections / currentDecided) * 100;
  const previousRejectionRate = previousDecided === 0 ? 0 : (previousRejections / previousDecided) * 100;
  const dauSparkline = countDistinctPerDay(auditLogs, (row) => row.createdAt, (row) => row.actorId, now);
  const previousDauSparkline = countDistinctPerDay(auditLogs.filter((row) => inRange(row.createdAt, window.previousStart, window.previousEnd)), (row) => row.createdAt, (row) => row.actorId, addUtcDays(window.previousEnd, -1));

  return {
    generatedAt: now.toISOString(),
    northStars: [
      buildMetric({
        key: "wahc",
        label: "WAHC",
        description: "Weekly active human+agent collaboration teams.",
        value: currentWahc,
        previousValue: previousWahc,
        sparkline: buildLastSevenDayKeys(now).map((key) => countIntersectionTeams(humanRows, agentActions, new Date(`${key}T00:00:00.000Z`), addUtcDays(new Date(`${key}T00:00:00.000Z`), 1))),
      }),
      buildMetric({
        key: "ao_rate",
        label: "AO%",
        description: "Share of collaboration actions with agent participation in the last 7 days.",
        value: currentAo,
        previousValue: previousAo,
        sparkline: buildLastSevenDayKeys(now).map((key) => {
          const start = new Date(`${key}T00:00:00.000Z`);
          const end = addUtcDays(start, 1);
          const human = humanRows.filter((row) => inRange(row.createdAt, start, end) || inRange(row.updatedAt, start, end)).length;
          const agent = agentActions.filter((row) => inRange(row.createdAt, start, end)).length;
          return human + agent === 0 ? 0 : (agent / (human + agent)) * 100;
        }),
      }),
      buildMetric({
        key: "agent_rejection_rate",
        label: "Agent rejection rate",
        description: "Rejected agent confirmations versus all decided confirmations in the last 7 days.",
        value: currentRejectionRate,
        previousValue: previousRejectionRate,
        sparkline: buildLastSevenDayKeys(now).map((key) => {
          const start = new Date(`${key}T00:00:00.000Z`);
          const end = addUtcDays(start, 1);
          const rejected = confirmations.filter((row) => row.status === "rejected" && inRange(row.decidedAt ?? row.createdAt, start, end)).length;
          const decided = confirmations.filter((row) => row.status !== "pending" && inRange(row.decidedAt ?? row.createdAt, start, end)).length;
          return decided === 0 ? 0 : (rejected / decided) * 100;
        }),
      }),
    ],
    supportMetrics: [
      buildMetric({
        key: "dau",
        label: "DAU",
        description: "Distinct active users per day from audit logs.",
        value: dauSparkline.at(-1) ?? 0,
        previousValue: previousDauSparkline.at(-1) ?? 0,
        sparkline: dauSparkline,
      }),
      buildMetric({
        key: "new_users",
        label: "New users",
        description: "Users created in the last 7 days.",
        value: users.filter((row) => inRange(row.createdAt, window.currentStart, window.now)).length,
        previousValue: users.filter((row) => inRange(row.createdAt, window.previousStart, window.previousEnd)).length,
        sparkline: countPerDay(users, (row) => row.createdAt, now),
      }),
      buildMetric({
        key: "new_posts",
        label: "New posts",
        description: "Posts created in the last 7 days.",
        value: posts.filter((row) => inRange(row.createdAt, window.currentStart, window.now)).length,
        previousValue: posts.filter((row) => inRange(row.createdAt, window.previousStart, window.previousEnd)).length,
        sparkline: countPerDay(posts, (row) => row.createdAt, now),
      }),
      buildMetric({
        key: "new_projects",
        label: "New projects",
        description: "Projects created in the last 7 days.",
        value: projects.filter((row) => inRange(row.createdAt, window.currentStart, window.now)).length,
        previousValue: projects.filter((row) => inRange(row.createdAt, window.previousStart, window.previousEnd)).length,
        sparkline: countPerDay(projects, (row) => row.createdAt, now),
      }),
      buildMetric({
        key: "active_subscriptions",
        label: "Active subscriptions",
        description: "Current active or trialing Pro subscriptions.",
        value: buildActiveSubscriptionsSparkline(subscriptions, now).at(-1) ?? 0,
        previousValue: buildActiveSubscriptionsSparkline(subscriptions, addUtcDays(now, -7)).at(-1) ?? 0,
        sparkline: buildActiveSubscriptionsSparkline(subscriptions, now),
      }),
      buildMetric({
        key: "open_reports",
        label: "Open reports",
        description: "Current report queue size.",
        value: buildOpenReportsSparkline(reports, now).at(-1) ?? 0,
        previousValue: buildOpenReportsSparkline(reports, addUtcDays(now, -7)).at(-1) ?? 0,
        sparkline: buildOpenReportsSparkline(reports, now),
      }),
    ],
  };
}
