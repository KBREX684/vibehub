import { listProjectFeed } from "@/lib/repository";
import { parsePagination } from "@/lib/pagination";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import type { ProjectSortOrder, ProjectStatus } from "@/lib/types";
import { safeServerErrorDetails } from "@/lib/safe-error-details";

const PROJECT_STATUSES: readonly ProjectStatus[] = ["idea", "building", "launched", "paused"];
const PROJECT_SORT_ORDERS: readonly ProjectSortOrder[] = ["latest", "hot", "featured", "recommended"];

function parseStatus(raw: string | null): ProjectStatus | undefined {
  if (!raw) {
    return undefined;
  }
  return PROJECT_STATUSES.includes(raw as ProjectStatus) ? (raw as ProjectStatus) : undefined;
}

function parseSort(raw: string | null): ProjectSortOrder {
  if (!raw) return "latest";
  return PROJECT_SORT_ORDERS.includes(raw as ProjectSortOrder) ? (raw as ProjectSortOrder) : "latest";
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
    const sort = parseSort(url.searchParams.get("sort"));
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

    if (cursor) {
      return apiError({ code: "CURSOR_NOT_SUPPORTED", message: "cursor is not supported on the P1 project feed" }, 400);
    }
    const result = await listProjectFeed({ query, tag, tech, status, team, sort, page, limit });
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
