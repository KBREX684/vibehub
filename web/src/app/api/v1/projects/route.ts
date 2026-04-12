import { listProjects } from "@/lib/repository";
import { parsePagination } from "@/lib/pagination";
import { apiError, apiSuccess } from "@/lib/response";
import type { ProjectStatus } from "@/lib/types";

const PROJECT_STATUSES: readonly ProjectStatus[] = ["idea", "building", "launched", "paused"];

function parseStatus(raw: string | null): ProjectStatus | undefined {
  if (!raw) {
    return undefined;
  }
  return PROJECT_STATUSES.includes(raw as ProjectStatus) ? (raw as ProjectStatus) : undefined;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { page, limit } = parsePagination(url.searchParams);
    const query = url.searchParams.get("query")?.trim() || undefined;
    const tag = url.searchParams.get("tag")?.trim() || undefined;
    const tech = url.searchParams.get("tech")?.trim() || undefined;
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

    const result = await listProjects({ query, tag, tech, status, page, limit });
    return apiSuccess(result);
  } catch (error) {
    return apiError(
      {
        code: "PROJECTS_LIST_FAILED",
        message: "Failed to list projects",
        details: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}
