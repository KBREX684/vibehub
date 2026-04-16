import { prisma } from "@/lib/db";
import { isMockDataEnabled } from "@/lib/runtime-mode";
import type { AdminAiInsight } from "@/lib/types";

const SENSITIVE = /\b(spam|scam|phishing|hack|malware|porn|nsfw)\b/i;

type RiskLevel = "low" | "medium" | "high";
type Priority = NonNullable<AdminAiInsight["priority"]>;

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

export async function getOrCreateReportTicketAi(targetId: string, reason: string) {
  const h = heuristicReportSummary({ reason, targetId });
  if (isMockDataEnabled()) {
    return { id: null as string | null, ...h };
  }
  const existing = await prisma.adminAiSuggestion.findFirst({
    where: { targetType: "report_ticket", targetId },
  });
  if (existing) {
    return { id: existing.id, ...h, suggestion: existing.suggestion, riskLevel: existing.riskLevel as RiskLevel, confidence: existing.confidence ?? h.confidence };
  }
  const row = await prisma.adminAiSuggestion.create({
    data: {
      targetType: "report_ticket",
      targetId,
      suggestion: h.suggestion,
      riskLevel: h.riskLevel,
      confidence: h.confidence,
    },
    select: { id: true, suggestion: true, riskLevel: true, confidence: true },
  });
  return { id: row.id, ...h, suggestion: row.suggestion, riskLevel: row.riskLevel as RiskLevel, confidence: row.confidence ?? h.confidence };
}

export async function getOrCreateEnterpriseAi(input: {
  userId: string;
  organizationName: string;
  organizationWebsite: string;
}) {
  const h = heuristicEnterpriseSummary(input);
  if (isMockDataEnabled()) {
    return { id: null as string | null, ...h };
  }
  const existing = await prisma.adminAiSuggestion.findFirst({
    where: { targetType: "enterprise_verification", targetId: input.userId },
  });
  if (existing) {
    return { id: existing.id, ...h, suggestion: existing.suggestion, riskLevel: existing.riskLevel as RiskLevel, confidence: existing.confidence ?? h.confidence };
  }
  const row = await prisma.adminAiSuggestion.create({
    data: {
      targetType: "enterprise_verification",
      targetId: input.userId,
      suggestion: h.suggestion,
      riskLevel: h.riskLevel,
      confidence: h.confidence,
    },
    select: { id: true, suggestion: true, riskLevel: true, confidence: true },
  });
  return { id: row.id, ...h, suggestion: row.suggestion, riskLevel: row.riskLevel as RiskLevel, confidence: row.confidence ?? h.confidence };
}

export async function getOrCreatePostReviewAi(input: {
  postId: string;
  title: string;
  body: string;
  tags: string[];
}) {
  const h = heuristicPostReviewSummary(input);
  if (isMockDataEnabled()) {
    return { id: null as string | null, ...h };
  }
  const existing = await prisma.adminAiSuggestion.findFirst({
    where: { targetType: "post_review", targetId: input.postId },
  });
  if (existing) {
    return { id: existing.id, ...h, suggestion: existing.suggestion, riskLevel: existing.riskLevel as RiskLevel, confidence: existing.confidence ?? h.confidence };
  }
  const row = await prisma.adminAiSuggestion.create({
    data: {
      targetType: "post_review",
      targetId: input.postId,
      suggestion: h.suggestion,
      riskLevel: h.riskLevel,
      confidence: h.confidence,
    },
    select: { id: true, suggestion: true, riskLevel: true, confidence: true },
  });
  return { id: row.id, ...h, suggestion: row.suggestion, riskLevel: row.riskLevel as RiskLevel, confidence: row.confidence ?? h.confidence };
}
