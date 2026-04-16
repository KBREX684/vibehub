import { prisma } from "@/lib/db";
import { isMockDataEnabled } from "@/lib/runtime-mode";

const SENSITIVE = /\b(spam|scam|phishing|hack|malware|porn|nsfw)\b/i;

export function heuristicEnterpriseSummary(payload: {
  organizationName: string;
  organizationWebsite: string;
  userId: string;
}): {
  suggestion: string;
  riskLevel: "low" | "medium" | "high";
  confidence: number;
} {
  const domainOk = /^https?:\/\//i.test(payload.organizationWebsite.trim());
  const suggestion = domainOk
    ? `Verify that "${payload.organizationName}" matches the public website ${payload.organizationWebsite}. Applicant ${payload.userId}.`
    : `Website URL may be incomplete — confirm organization "${payload.organizationName}" using independent sources. Applicant ${payload.userId}.`;
  return { suggestion, riskLevel: domainOk ? "low" : "medium", confidence: 0.4 };
}

export function heuristicReportSummary(payload: { reason: string; targetId: string }): {
  suggestion: string;
  riskLevel: "low" | "medium" | "high";
  confidence: number;
} {
  const flagged = SENSITIVE.test(payload.reason);
  const riskLevel: "low" | "medium" | "high" = flagged ? "medium" : "low";
  const suggestion = flagged
    ? `The reporter cited potentially sensitive keywords. Review the reported content and context before deciding. Ticket ${payload.targetId}.`
    : `Standard report. Review the original content and reporter notes. Ticket ${payload.targetId}.`;
  return { suggestion, riskLevel, confidence: flagged ? 0.55 : 0.35 };
}

export async function getOrCreateReportTicketAi(targetId: string, reason: string) {
  if (isMockDataEnabled()) {
    const h = heuristicReportSummary({ reason, targetId });
    return { id: null as string | null, ...h };
  }
  const existing = await prisma.adminAiSuggestion.findFirst({
    where: { targetType: "report_ticket", targetId },
  });
  if (existing) {
    return {
      id: existing.id,
      suggestion: existing.suggestion,
      riskLevel: existing.riskLevel as "low" | "medium" | "high",
      confidence: existing.confidence ?? undefined,
    };
  }
  const h = heuristicReportSummary({ reason, targetId });
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
  return {
    id: row.id,
    suggestion: row.suggestion,
    riskLevel: row.riskLevel as "low" | "medium" | "high",
    confidence: row.confidence ?? undefined,
  };
}

export async function getOrCreateEnterpriseAi(input: {
  userId: string;
  organizationName: string;
  organizationWebsite: string;
}) {
  if (isMockDataEnabled()) {
    const h = heuristicEnterpriseSummary(input);
    return { id: null as string | null, ...h };
  }
  const existing = await prisma.adminAiSuggestion.findFirst({
    where: { targetType: "enterprise_verification", targetId: input.userId },
  });
  if (existing) {
    return {
      id: existing.id,
      suggestion: existing.suggestion,
      riskLevel: existing.riskLevel as "low" | "medium" | "high",
      confidence: existing.confidence ?? undefined,
    };
  }
  const h = heuristicEnterpriseSummary(input);
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
  return {
    id: row.id,
    suggestion: row.suggestion,
    riskLevel: row.riskLevel as "low" | "medium" | "high",
    confidence: row.confidence ?? undefined,
  };
}
