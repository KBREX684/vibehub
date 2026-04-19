import type { NextRequest } from "next/server";
import { authenticateRequest, rateLimitedResponse, resolveReadAuth } from "@/lib/auth";
import { listTeamActivityLog } from "@/lib/repository";
import { parsePagination } from "@/lib/pagination";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { safeServerErrorDetails } from "@/lib/safe-error-details";

interface Params {
  params: Promise<{ slug: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await authenticateRequest(request, "read:team:detail");
  const gate = resolveReadAuth(auth, false);
  if (!gate.ok) {
    if (gate.status === 429) return rateLimitedResponse(gate.retryAfterSeconds ?? 60);
    return apiError({ code: "UNAUTHORIZED", message: "Login or API key required" }, 401);
  }

  try {
    const { slug } = await params;
    const url = new URL(request.url);
    const { page, limit } = parsePagination(url.searchParams);
    const typeRaw = url.searchParams.get("type");
    const type =
      typeRaw === "task" ||
      typeRaw === "discussion" ||
      typeRaw === "workspace" ||
      typeRaw === "confirmation" ||
      typeRaw === "agent"
        ? typeRaw
        : "all";
    const result = await listTeamActivityLog({ teamSlug: slug, page, limit, type });
    return apiSuccess(result);
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    return apiError(
      {
        code: "ACTIVITY_LOG_FAILED",
        message: "Failed to fetch activity log",
        details: safeServerErrorDetails(error),
      },
      500
    );
  }
}
