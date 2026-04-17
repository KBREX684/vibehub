import { apiSuccess } from "@/lib/response";
import { requireAdminSession } from "@/lib/admin-auth";
import { parsePagination } from "@/lib/pagination";
import { listAdminAiSuggestions } from "@/lib/admin-ai";
import type { AdminAiDecisionValue, AdminAiSuggestionTargetValue } from "@/lib/types";

export async function GET(request: Request) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const { page, limit } = parsePagination(url.searchParams);
  const targetType = (url.searchParams.get("targetType")?.trim() || undefined) as AdminAiSuggestionTargetValue | undefined;
  const riskLevel = (url.searchParams.get("riskLevel")?.trim() || undefined) as "low" | "medium" | "high" | undefined;
  const adminDecision = (url.searchParams.get("adminDecision")?.trim() || undefined) as AdminAiDecisionValue | undefined;
  const queue = url.searchParams.get("queue")?.trim() || undefined;

  const result = await listAdminAiSuggestions({ targetType, riskLevel, adminDecision, queue, page, limit });
  return apiSuccess(result);
}
