import { listProjects } from "@/lib/repository";
import { parsePagination } from "@/lib/pagination";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import type { ProjectStatus } from "@/lib/types";
import { safeServerErrorDetails } from "@/lib/safe-error-details";

const PROJECT_STATUSES: readonly ProjectStatus[] = ["idea", "building", "launched", "paused"];

function parseStatus(raw: string | null): ProjectStatus | undefined {
  if (!raw) {
    return undefined;
  }
  return PROJECT_STATUSES.includes(raw as ProjectStatus) ? (raw as ProjectStatus) : undefined;
}

/** Anonymous-safe project list (P4-3). Same query params as `/api/v1/projects` GET. */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { page, limit } = parsePagination(url.searchParams);
    const cursor = url.searchParams.get("cursor")?.trim() || undefined;
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

    const result = await listProjects({ query, tag, tech, status, team, page, limit, cursor });
    return apiSuccess(result);
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
return apiError(
      {
        code: "PUBLIC_PROJECTS_LIST_FAILED",
        message: "Failed to list projects",
        details: safeServerErrorDetails(error),
      },
      500
    );
  }
}