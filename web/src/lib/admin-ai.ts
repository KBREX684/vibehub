import { prisma } from "@/lib/db";
import { isMockDataEnabled } from "@/lib/runtime-mode";
import { mockAdminAiSuggestions, mockEnterpriseProfiles, mockEnterpriseVerificationApplications, mockPosts, mockReportTickets } from "@/lib/data/mock-data";
import { generateAdminAiSuggestionWithProvider } from "@/lib/admin-ai-provider";
import type {
  AdminAiDecisionValue,
  AdminAiInsight,
  AdminAiSuggestionRecord,
  AdminAiSuggestionTargetValue,
} from "@/lib/types";

const SENSITIVE = /\b(spam|scam|phishing|hack|malware|porn|nsfw)\b/i;

type RiskLevel = NonNullable<AdminAiInsight["riskLevel"]>;
type Priority = NonNullable<AdminAiInsight["priority"]>;

interface Paginated<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function insight(base: {
  suggestion: string;
  riskLevel: RiskLevel;
  confidence: number;
  priority: Priority;
  queue: string;
  labels: string[];
}): AdminAiInsight {
  return base;
}

function toAdminAiSuggestionRecord(row: {
  id: string;
  targetType: AdminAiSuggestionTargetValue | string;
  targetId: string;
  suggestion: string;
  riskLevel: RiskLevel | string;
  confidence: number | null;
  queue?: string | null;
  priority?: string | null;
  labels?: unknown;
  adminDecision: AdminAiDecisionValue | string;
  adminUserId?: string | null;
  decisionNote?: string | null;
  decidedAt?: Date | string | null;
  modelProvider?: string | null;
  modelName?: string | null;
  createdAt: Date | string;
  updatedAt?: Date | string | null;
}): AdminAiSuggestionRecord {
  return {
    id: row.id,
    targetType: row.targetType as AdminAiSuggestionTargetValue,
    targetId: row.targetId,
    suggestion: row.suggestion,
    riskLevel: row.riskLevel as RiskLevel,
    confidence: row.confidence ?? undefined,
    queue: row.queue ?? undefined,
    priority: (row.priority as Priority | undefined) ?? "normal",
    labels: Array.isArray(row.labels)
      ? row.labels.filter((item): item is string => typeof item === "string")
      : undefined,
    adminDecision: row.adminDecision as AdminAiDecisionValue,
    adminUserId: row.adminUserId ?? undefined,
    decisionNote: row.decisionNote ?? undefined,
    decidedAt:
      row.decidedAt instanceof Date ? row.decidedAt.toISOString() : row.decidedAt ?? undefined,
    modelProvider: row.modelProvider ?? undefined,
    modelName: row.modelName ?? undefined,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    updatedAt:
      row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt ?? (row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt),
  };
}

function paginate<T>(items: T[], page: number, limit: number): Paginated<T> {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const total = items.length;
  const start = (safePage - 1) * safeLimit;
  return {
    items: items.slice(start, start + safeLimit),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    },
  };
}

function matchesDateRange(value: string | Date, dateFrom?: string, dateTo?: string): boolean {
  const ts = new Date(value).getTime();
  if (Number.isNaN(ts)) return false;
  if (dateFrom) {
    const fromTs = new Date(dateFrom).getTime();
    if (!Number.isNaN(fromTs) && ts < fromTs) return false;
  }
  if (dateTo) {
    const toTs = new Date(dateTo).getTime();
    if (!Number.isNaN(toTs) && ts > toTs) return false;
  }
  return true;
}

function normalizeLabels(labels?: string[]): string[] | undefined {
  if (!labels?.length) return undefined;
  const next = labels.map((label) => label.trim()).filter(Boolean);
  return next.length > 0 ? next.slice(0, 12) : undefined;
}

export function heuristicEnterpriseSummary(payload: {
  organizationName: string;
  organizationWebsite: string;
  userId: string;
}): AdminAiInsight {
  const domainOk = /^https?:\/\//i.test(payload.organizationWebsite.trim());
  return insight({
    suggestion: domainOk
      ? `Verify that "${payload.organizationName}" matches the public website ${payload.organizationWebsite}. Applicant ${payload.userId}.`
      : `Website URL may be incomplete — confirm organization "${payload.organizationName}" using independent sources. Applicant ${payload.userId}.`,
    riskLevel: domainOk ? "low" : "medium",
    confidence: domainOk ? 0.44 : 0.58,
    priority: domainOk ? "normal" : "high",
    queue: "enterprise-verification",
    labels: domainOk ? ["domain-check"] : ["manual-source-check", "incomplete-website"],
  });
}

export function heuristicReportSummary(payload: { reason: string; targetId: string }): AdminAiInsight {
  const flagged = SENSITIVE.test(payload.reason);
  return insight({
    suggestion: flagged
      ? `The reporter cited sensitive keywords. Review the reported content and context before deciding. Ticket ${payload.targetId}.`
      : `Standard report. Review the original content, discussion context, and reporter notes. Ticket ${payload.targetId}.`,
    riskLevel: flagged ? "high" : "low",
    confidence: flagged ? 0.67 : 0.38,
    priority: flagged ? "urgent" : "normal",
    queue: flagged ? "content-safety-fastlane" : "reports-standard",
    labels: flagged ? ["sensitive-keywords", "manual-confirmation"] : ["standard-report"],
  });
}

export function heuristicPostReviewSummary(input: {
  postId: string;
  title: string;
  body: string;
  tags: string[];
}): AdminAiInsight {
  const joined = `${input.title}\n${input.body}\n${input.tags.join(" ")}`;
  const flagged = SENSITIVE.test(joined);
  const outboundLinks = (input.body.match(/https?:\/\//gi) ?? []).length;
  const riskLevel: RiskLevel =
    flagged || outboundLinks >= 3 ? "high" : outboundLinks >= 1 ? "medium" : "low";
  return insight({
    suggestion:
      riskLevel === "high"
        ? `High-risk indicators found for post ${input.postId}. Check for spam, scams, phishing, malware, or policy-violating outbound links before approving.`
        : riskLevel === "medium"
          ? `Post ${input.postId} contains external links or promotional patterns. Review context before approving.`
          : `Low-risk draft for post ${input.postId}. Do a normal human review before approving.`,
    riskLevel,
    confidence: riskLevel === "high" ? 0.72 : riskLevel === "medium" ? 0.48 : 0.31,
    priority: riskLevel === "high" ? "high" : riskLevel === "medium" ? "normal" : "low",
    queue: riskLevel === "high" ? "moderation-fastlane" : "moderation-standard",
    labels: [
      ...(flagged ? ["safety-keywords"] : []),
      ...(outboundLinks > 0 ? ["external-links"] : []),
      riskLevel === "low" ? "routine-review" : "manual-confirmation",
    ],
  });
}

export function heuristicProjectCurationSummary(input: {
  projectId: string;
  title: string;
  oneLiner: string;
  hasDemoUrl: boolean;
  hasRepoUrl: boolean;
  bookmarkCount?: number;
  collaborationIntentCount?: number;
  screenshots?: number;
}): AdminAiInsight {
  const completeness = [input.hasDemoUrl, input.hasRepoUrl, Boolean(input.oneLiner.trim()), (input.screenshots ?? 0) > 0].filter(Boolean).length;
  const traction = (input.bookmarkCount ?? 0) + (input.collaborationIntentCount ?? 0) * 2;
  const riskLevel: RiskLevel = completeness >= 3 ? "low" : completeness === 2 ? "medium" : "high";
  const priority: Priority = traction >= 6 ? "high" : completeness >= 3 ? "normal" : "low";
  return insight({
    suggestion:
      riskLevel === "low"
        ? `Project ${input.projectId} looks feature-ready for editorial review. Validate claims and visuals, then consider it for the daily featured rail.`
        : riskLevel === "medium"
          ? `Project ${input.projectId} shows some traction but is missing one or more proof points. Check demo, repo quality, or screenshots before featuring.`
          : `Project ${input.projectId} lacks enough evidence for editorial featuring. Ask the creator to add a demo, repo, or screenshots before promotion.`,
    riskLevel,
    confidence: riskLevel === "low" ? 0.64 : riskLevel === "medium" ? 0.49 : 0.62,
    priority,
    queue: "featured-curation",
    labels: [
      ...(input.hasDemoUrl ? ["has-demo"] : ["missing-demo"]),
      ...(input.hasRepoUrl ? ["has-repo"] : ["missing-repo"]),
      ...((input.screenshots ?? 0) > 0 ? ["has-screenshots"] : ["missing-screenshots"]),
      ...(traction >= 6 ? ["strong-traction"] : traction >= 2 ? ["emerging-traction"] : ["low-traction"]),
    ],
  });
}

export function heuristicReportBatchSuggestions(
  tickets: Array<{ id: string; reporterId: string; targetId: string; reason: string; status: string }>
): Array<{ label: string; count: number; suggestion: string }> {
  const buckets = new Map<string, { count: number; suggestion: string }>();
  for (const ticket of tickets) {
    const reason = ticket.reason.toLowerCase();
    const key = SENSITIVE.test(reason)
      ? "sensitive-content"
      : reason.includes("spam")
        ? "spam-wave"
        : reason.includes("abuse") || reason.includes("harass")
          ? "abuse-pattern"
          : "general-review";
    const suggestion =
      key === "sensitive-content"
        ? "Escalate these tickets into the fastest safety queue and preserve moderator notes."
        : key === "spam-wave"
          ? "Batch-handle likely spam with one reviewer owning the cluster."
          : key === "abuse-pattern"
            ? "Check conversation context and repeated reporter/target pairs before closing."
            : "Use the standard report queue and merge duplicates where possible.";
    const current = buckets.get(key);
    buckets.set(key, { count: (current?.count ?? 0) + 1, suggestion });
  }
  return [...buckets.entries()]
    .map(([label, value]) => ({ label, count: value.count, suggestion: value.suggestion }))
    .sort((a, b) => b.count - a.count);
}

export function heuristicUserBehaviorPatterns(
  tickets: Array<{ reporterId: string; targetId: string; status: string }>
): {
  highFrequencyReporters: Array<{ userId: string; count: number }>;
  highFrequencyTargets: Array<{ userId: string; count: number }>;
} {
  const reporterCounts = new Map<string, number>();
  const targetCounts = new Map<string, number>();
  for (const ticket of tickets) {
    reporterCounts.set(ticket.reporterId, (reporterCounts.get(ticket.reporterId) ?? 0) + 1);
    targetCounts.set(ticket.targetId, (targetCounts.get(ticket.targetId) ?? 0) + 1);
  }
  const toSorted = (source: Map<string, number>) =>
    [...source.entries()]
      .map(([userId, count]) => ({ userId, count }))
      .filter((row) => row.count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  return {
    highFrequencyReporters: toSorted(reporterCounts),
    highFrequencyTargets: toSorted(targetCounts),
  };
}

export function heuristicContentPatrolReport(input: {
  pendingModerationCount: number;
  openReportsCount: number;
  highRiskReportCount: number;
}): Array<string> {
  const lines: string[] = [];
  if (input.highRiskReportCount > 0) {
    lines.push(`Prioritize ${input.highRiskReportCount} high-risk report tickets before the standard moderation queue.`);
  }
  if (input.pendingModerationCount > 20) {
    lines.push("Moderation backlog is elevated. Split the queue across at least two reviewers this cycle.");
  } else {
    lines.push("Moderation backlog is within normal range. Keep the fastlane focused on safety-sensitive tickets.");
  }
  if (input.openReportsCount > input.pendingModerationCount) {
    lines.push("Open reports exceed pending post reviews. Bias reviewer time toward reports until the queue stabilizes.");
  }
  return lines;
}

function buildReportContext(report: { id: string; reason: string; targetId: string; reporterId: string; status: string }) {
  return [
    `Reporter: ${report.reporterId}`,
    `Target: ${report.targetId}`,
    `Status: ${report.status}`,
    `Reason: ${report.reason}`,
  ].join("\n");
}

function buildPostContext(post: { id: string; title: string; body: string; tags: string[]; reviewStatus?: string; authorId?: string }) {
  return [
    `Title: ${post.title}`,
    `Author: ${post.authorId ?? "unknown"}`,
    `ReviewStatus: ${post.reviewStatus ?? "pending"}`,
    `Tags: ${post.tags.join(", ") || "none"}`,
    `Body:\n${post.body}`,
  ].join("\n");
}

function buildEnterpriseContext(input: {
  userId: string;
  organizationName: string;
  organizationWebsite: string;
  workEmail?: string;
  useCase?: string;
  status?: string;
}) {
  return [
    `Applicant: ${input.userId}`,
    `Organization: ${input.organizationName || "unknown"}`,
    `Website: ${input.organizationWebsite || "missing"}`,
    `Work email: ${input.workEmail || "missing"}`,
    `Status: ${input.status ?? "pending"}`,
    `Use case: ${input.useCase || "not provided"}`,
  ].join("\n");
}

function toStoredRecord(input: {
  id: string;
  targetType: AdminAiSuggestionTargetValue;
  targetId: string;
  heuristic: AdminAiInsight;
  adminDecision?: AdminAiDecisionValue;
  decisionNote?: string;
  adminUserId?: string;
  decidedAt?: string;
  modelProvider?: string;
  modelName?: string;
  createdAt?: string;
  updatedAt?: string;
}): AdminAiSuggestionRecord {
  return {
    id: input.id,
    targetType: input.targetType,
    targetId: input.targetId,
    suggestion: input.heuristic.suggestion,
    riskLevel: input.heuristic.riskLevel,
    confidence: input.heuristic.confidence,
    queue: input.heuristic.queue,
    priority: input.heuristic.priority,
    labels: normalizeLabels(input.heuristic.labels),
    adminDecision: input.adminDecision ?? "pending",
    decisionNote: input.decisionNote,
    adminUserId: input.adminUserId,
    decidedAt: input.decidedAt,
    modelProvider: input.modelProvider,
    modelName: input.modelName,
    createdAt: input.createdAt ?? new Date().toISOString(),
    updatedAt: input.updatedAt ?? input.createdAt ?? new Date().toISOString(),
  };
}

function mapStoredSuggestion(record: AdminAiSuggestionRecord | undefined, fallback?: AdminAiInsight): AdminAiSuggestionRecord | undefined {
  if (record) return record;
  if (!fallback) return undefined;
  return {
    id: `preview_${Date.now()}`,
    targetType: "other",
    targetId: "preview",
    suggestion: fallback.suggestion,
    riskLevel: fallback.riskLevel,
    confidence: fallback.confidence,
    queue: fallback.queue,
    priority: fallback.priority,
    labels: fallback.labels,
    adminDecision: "pending",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function listAdminAiSuggestions(params: {
  targetType?: AdminAiSuggestionTargetValue;
  riskLevel?: RiskLevel;
  adminDecision?: AdminAiDecisionValue;
  queue?: string;
  page: number;
  limit: number;
}): Promise<Paginated<AdminAiSuggestionRecord>> {
  if (isMockDataEnabled()) {
    const filtered = mockAdminAiSuggestions.filter((item) => {
      if (params.targetType && item.targetType !== params.targetType) return false;
      if (params.riskLevel && item.riskLevel !== params.riskLevel) return false;
      if (params.adminDecision && item.adminDecision !== params.adminDecision) return false;
      if (params.queue && item.queue !== params.queue) return false;
      return true;
    });
    filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return paginate(filtered, params.page, params.limit);
  }

  const where = {
    ...(params.targetType ? { targetType: params.targetType } : {}),
    ...(params.riskLevel ? { riskLevel: params.riskLevel } : {}),
    ...(params.adminDecision ? { adminDecision: params.adminDecision } : {}),
    ...(params.queue ? { queue: params.queue } : {}),
  };
  const page = Math.max(1, params.page);
  const limit = Math.min(Math.max(params.limit, 1), 100);
  const [items, total] = await Promise.all([
    prisma.adminAiSuggestion.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.adminAiSuggestion.count({ where }),
  ]);

  return {
    items: items.map(toAdminAiSuggestionRecord),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export async function listStoredAdminAiSuggestionsByTargets(params: {
  targetType: AdminAiSuggestionTargetValue;
  targetIds: string[];
}): Promise<Map<string, AdminAiSuggestionRecord>> {
  const ids = [...new Set(params.targetIds.filter(Boolean))];
  if (ids.length === 0) return new Map();

  if (isMockDataEnabled()) {
    const filtered = mockAdminAiSuggestions.filter(
      (item) => item.targetType === params.targetType && ids.includes(item.targetId)
    );
    return new Map(filtered.map((item) => [item.targetId, item]));
  }

  const rows = await prisma.adminAiSuggestion.findMany({
    where: {
      targetType: params.targetType,
      targetId: { in: ids },
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });
  const map = new Map<string, AdminAiSuggestionRecord>();
  for (const row of rows) {
    if (!map.has(row.targetId)) {
      map.set(row.targetId, toAdminAiSuggestionRecord(row));
    }
  }
  return map;
}

export async function getStoredAdminAiSuggestion(params: {
  targetType: AdminAiSuggestionTargetValue;
  targetId: string;
}): Promise<AdminAiSuggestionRecord | null> {
  if (isMockDataEnabled()) {
    return (
      mockAdminAiSuggestions.find(
        (item) => item.targetType === params.targetType && item.targetId === params.targetId
      ) ?? null
    );
  }

  const row = await prisma.adminAiSuggestion.findFirst({
    where: {
      targetType: params.targetType,
      targetId: params.targetId,
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });
  return row ? toAdminAiSuggestionRecord(row) : null;
}

async function upsertAdminAiSuggestion(params: {
  targetType: AdminAiSuggestionTargetValue;
  targetId: string;
  insight: AdminAiInsight;
  modelProvider?: string;
  modelName?: string;
}): Promise<AdminAiSuggestionRecord> {
  const labels = normalizeLabels(params.insight.labels);
  if (isMockDataEnabled()) {
    const existing = mockAdminAiSuggestions.find(
      (item) => item.targetType === params.targetType && item.targetId === params.targetId
    );
    const now = new Date().toISOString();
    if (existing) {
      existing.suggestion = params.insight.suggestion;
      existing.riskLevel = params.insight.riskLevel;
      existing.confidence = params.insight.confidence;
      existing.queue = params.insight.queue;
      existing.priority = params.insight.priority ?? "normal";
      existing.labels = labels;
      existing.modelProvider = params.modelProvider;
      existing.modelName = params.modelName;
      existing.updatedAt = now;
      existing.adminDecision = "pending";
      existing.decisionNote = undefined;
      existing.adminUserId = undefined;
      existing.decidedAt = undefined;
      return existing;
    }
    const created = toStoredRecord({
      id: `ai_${Date.now()}`,
      targetType: params.targetType,
      targetId: params.targetId,
      heuristic: { ...params.insight, labels },
      modelProvider: params.modelProvider,
      modelName: params.modelName,
    });
    mockAdminAiSuggestions.unshift(created);
    return created;
  }

  const data = {
    suggestion: params.insight.suggestion,
    riskLevel: params.insight.riskLevel,
    confidence: params.insight.confidence,
    queue: params.insight.queue,
    priority: params.insight.priority ?? "normal",
    labels,
    adminDecision: "pending" as const,
    decisionNote: null,
    adminUserId: null,
    decidedAt: null,
    modelProvider: params.modelProvider ?? null,
    modelName: params.modelName ?? null,
  };
  const existing = await prisma.adminAiSuggestion.findFirst({
    where: { targetType: params.targetType, targetId: params.targetId },
    select: { id: true },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });
  const row = existing
    ? await prisma.adminAiSuggestion.update({
        where: { id: existing.id },
        data,
      })
    : await prisma.adminAiSuggestion.create({
        data: {
          targetType: params.targetType,
          targetId: params.targetId,
          ...data,
        },
      });

  return toAdminAiSuggestionRecord(row);
}

export async function decideAdminAiSuggestion(params: {
  suggestionId: string;
  adminUserId: string;
  decision: Exclude<AdminAiDecisionValue, "pending">;
  decisionNote?: string;
}): Promise<AdminAiSuggestionRecord> {
  const decisionNote = params.decisionNote?.trim() || undefined;

  if (isMockDataEnabled()) {
    const existing = mockAdminAiSuggestions.find((item) => item.id === params.suggestionId);
    if (!existing) throw new Error("ADMIN_AI_SUGGESTION_NOT_FOUND");
    existing.adminDecision = params.decision;
    existing.adminUserId = params.adminUserId;
    existing.decisionNote = decisionNote;
    existing.decidedAt = new Date().toISOString();
    existing.updatedAt = existing.decidedAt;
    return existing;
  }

  const existing = await prisma.adminAiSuggestion.findUnique({ where: { id: params.suggestionId } });
  if (!existing) throw new Error("ADMIN_AI_SUGGESTION_NOT_FOUND");
  const row = await prisma.adminAiSuggestion.update({
    where: { id: params.suggestionId },
    data: {
      adminDecision: params.decision,
      adminUserId: params.adminUserId,
      decisionNote: decisionNote ?? null,
      decidedAt: new Date(),
    },
  });
  return toAdminAiSuggestionRecord(row);
}

async function resolveAdminAiTarget(params: {
  task: "summarize_report" | "triage_post" | "verify_enterprise";
  targetId: string;
}): Promise<{ targetType: AdminAiSuggestionTargetValue; targetId: string; fallback: AdminAiInsight; context: string }> {
  if (params.task === "summarize_report") {
    if (isMockDataEnabled()) {
      const ticket = mockReportTickets.find((item) => item.id === params.targetId);
      if (!ticket) throw new Error("REPORT_TICKET_NOT_FOUND");
      return {
        targetType: "report_ticket",
        targetId: ticket.id,
        fallback: heuristicReportSummary({ reason: ticket.reason, targetId: ticket.id }),
        context: buildReportContext(ticket),
      };
    }
    const ticket = await prisma.reportTicket.findUnique({
      where: { id: params.targetId },
      select: { id: true, targetId: true, reporterId: true, reason: true, status: true },
    });
    if (!ticket) throw new Error("REPORT_TICKET_NOT_FOUND");
    return {
      targetType: "report_ticket",
      targetId: ticket.id,
      fallback: heuristicReportSummary({ reason: ticket.reason, targetId: ticket.id }),
      context: buildReportContext(ticket),
    };
  }

  if (params.task === "triage_post") {
    if (isMockDataEnabled()) {
      const post = mockPosts.find((item) => item.id === params.targetId);
      if (!post) throw new Error("POST_NOT_FOUND");
      return {
        targetType: "post_review",
        targetId: post.id,
        fallback: heuristicPostReviewSummary({ postId: post.id, title: post.title, body: post.body, tags: post.tags }),
        context: buildPostContext(post),
      };
    }
    const post = await prisma.post.findUnique({
      where: { id: params.targetId },
      select: { id: true, title: true, body: true, tags: true, reviewStatus: true, authorId: true },
    });
    if (!post) throw new Error("POST_NOT_FOUND");
    return {
      targetType: "post_review",
      targetId: post.id,
      fallback: heuristicPostReviewSummary({ postId: post.id, title: post.title, body: post.body, tags: post.tags }),
      context: buildPostContext(post),
    };
  }

  if (isMockDataEnabled()) {
    const profile =
      mockEnterpriseProfiles.find((item) => item.userId === params.targetId) ||
      mockEnterpriseVerificationApplications.find((item) => item.userId === params.targetId);
    if (!profile) throw new Error("ENTERPRISE_PROFILE_NOT_FOUND");
    return {
      targetType: "enterprise_verification",
      targetId: profile.userId,
      fallback: heuristicEnterpriseSummary({
        userId: profile.userId,
        organizationName: profile.organizationName,
        organizationWebsite: profile.organizationWebsite,
      }),
      context: buildEnterpriseContext({
        userId: profile.userId,
        organizationName: profile.organizationName,
        organizationWebsite: profile.organizationWebsite,
        workEmail: profile.workEmail,
        useCase: profile.useCase,
        status: profile.status,
      }),
    };
  }

  const profile = await prisma.user.findUnique({
    where: { id: params.targetId },
    select: {
      id: true,
      email: true,
      enterpriseProfile: {
        select: {
          status: true,
          organization: true,
          website: true,
          useCase: true,
        },
      },
    },
  });
  if (!profile?.enterpriseProfile) throw new Error("ENTERPRISE_PROFILE_NOT_FOUND");
  return {
    targetType: "enterprise_verification",
    targetId: profile.id,
    fallback: heuristicEnterpriseSummary({
      userId: profile.id,
      organizationName: profile.enterpriseProfile.organization ?? "",
      organizationWebsite: profile.enterpriseProfile.website ?? "",
    }),
    context: buildEnterpriseContext({
      userId: profile.id,
      organizationName: profile.enterpriseProfile.organization ?? "",
      organizationWebsite: profile.enterpriseProfile.website ?? "",
      workEmail: profile.email,
      useCase: profile.enterpriseProfile.useCase ?? undefined,
      status: profile.enterpriseProfile.status,
    }),
  };
}

export async function generateAdminAiSuggestion(params: {
  task: "summarize_report" | "triage_post" | "verify_enterprise";
  targetId: string;
}): Promise<AdminAiSuggestionRecord> {
  const target = await resolveAdminAiTarget(params);
  const providerSuggestion = await generateAdminAiSuggestionWithProvider({
    task: params.task,
    targetType: target.targetType,
    targetId: target.targetId,
    context: target.context,
  });

  return upsertAdminAiSuggestion({
    targetType: target.targetType,
    targetId: target.targetId,
    insight: providerSuggestion ?? target.fallback,
    modelProvider: providerSuggestion?.modelProvider ?? (providerSuggestion ? undefined : "heuristic"),
    modelName: providerSuggestion?.modelName,
  });
}

export async function getOrCreateReportTicketAi(targetId: string, reason: string) {
  const existing = await getStoredAdminAiSuggestion({ targetType: "report_ticket", targetId });
  if (existing) return existing;
  return mapStoredSuggestion(undefined, heuristicReportSummary({ reason, targetId }))!;
}

export async function getOrCreateEnterpriseAi(input: {
  userId: string;
  organizationName: string;
  organizationWebsite: string;
}) {
  const existing = await getStoredAdminAiSuggestion({ targetType: "enterprise_verification", targetId: input.userId });
  if (existing) return existing;
  return mapStoredSuggestion(
    undefined,
    heuristicEnterpriseSummary(input)
  )!;
}

export async function getOrCreatePostReviewAi(input: {
  postId: string;
  title: string;
  body: string;
  tags: string[];
}) {
  const existing = await getStoredAdminAiSuggestion({ targetType: "post_review", targetId: input.postId });
  if (existing) return existing;
  return mapStoredSuggestion(
    undefined,
    heuristicPostReviewSummary(input)
  )!;
}

export function filterAdminAiSuggestionsInMemory(
  items: AdminAiSuggestionRecord[],
  params: {
    targetType?: AdminAiSuggestionTargetValue;
    riskLevel?: RiskLevel;
    adminDecision?: AdminAiDecisionValue;
    queue?: string;
    dateFrom?: string;
    dateTo?: string;
  }
) {
  return items.filter((item) => {
    if (params.targetType && item.targetType !== params.targetType) return false;
    if (params.riskLevel && item.riskLevel !== params.riskLevel) return false;
    if (params.adminDecision && item.adminDecision !== params.adminDecision) return false;
    if (params.queue && item.queue !== params.queue) return false;
    if (!matchesDateRange(item.createdAt, params.dateFrom, params.dateTo)) return false;
    return true;
  });
}
