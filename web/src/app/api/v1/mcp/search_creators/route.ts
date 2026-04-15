import type { NextRequest } from "next/server";
import { authenticateRequest, rateLimitedResponse, resolveReadAuth } from "@/lib/auth";
import { listCreators } from "@/lib/repository";
import { parsePagination } from "@/lib/pagination";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { safeServerErrorDetails } from "@/lib/safe-error-details";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, "read:creators:list");
  const gate = resolveReadAuth(auth, true);
  if (!gate.ok) {
    if (gate.status === 429) {
      return rateLimitedResponse(gate.retryAfterSeconds ?? 60);
    }
    return apiError({ code: "UNAUTHORIZED", message: "API key with read:creators:list required" }, 401);
  }

  try {
    const url = new URL(request.url);
    const { page, limit } = parsePagination(url.searchParams);
    const query = url.searchParams.get("query") ?? undefined;
    const result = await listCreators({ query, page, limit });

    return apiSuccess({
      tool: "search_creators",
      input: { query, page, limit },
      output: result,
    });
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
return apiError(
      {
        code: "MCP_SEARCH_CREATORS_FAILED",
        message: "Failed to execute MCP tool search_creators",
        details: safeServerErrorDetails(error),
      },
      500
    );
  }
}