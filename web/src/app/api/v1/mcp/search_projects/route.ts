import type { NextRequest } from "next/server";
import { authenticateRequest, rateLimitedResponse, resolveReadAuth } from "@/lib/auth";
import { listProjects } from "@/lib/repository";
import { parsePagination } from "@/lib/pagination";
import { apiError, apiSuccess } from "@/lib/response";
import type { ProjectStatus } from "@/lib/types";
import { safeServerErrorDetails } from "@/lib/safe-error-details";

const PROJECT_STATUSES: readonly ProjectStatus[] = ["idea", "building", "launched", "paused"];

function parseStatus(raw: string | null): ProjectStatus | undefined {
  if (!raw) {
    return undefined;
  }
  return PROJECT_STATUSES.includes(raw as ProjectStatus) ? (raw as ProjectStatus) : undefined;
}

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, "read:projects:list");
  const gate = resolveReadAuth(auth, true);
  if (!gate.ok) {
    if (gate.status === 429) {
      return rateLimitedResponse(gate.retryAfterSeconds ?? 60);
    }
    return apiError({ code: "UNAUTHORIZED", message: "API key with read:projects:list required" }, 401);
  }

  try {
    const url = new URL(request.url);
    const { page, limit } = parsePagination(url.searchParams);
    const query = url.searchParams.get("query")?.trim() || undefined;
    const tag = url.searchParams.get("tag")?.trim() || undefined;
    const tech = url.searchParams.get("tech")?.trim() || undefined;
    const team = url.searchParams.get("team")?.trim() || undefined;
    const rawStatus = url.searchParams.get("status");
    const status = parseStatus(rawStatus);
    if (rawStatus && !status) {
      return apiError(
        {
          code: "INVALID_STATUS",
          message: `status must be one of: ${PROJECT_STATUSES.join(", ")}`,
        },
        400
      );
    }

    const result = await listProjects({ query, tag, tech, status, team, page, limit });

    return apiSuccess({
      tool: "search_projects",
      input: { query, tag, tech, status, team, page, limit },
      output: result,
    });
  } catch (error) {
    return apiError(
      {
        code: "MCP_SEARCH_PROJECTS_FAILED",
        message: "Failed to execute MCP tool search_projects",
        details: safeServerErrorDetails(error),
      },
      500
    );
  }
}
