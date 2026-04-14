import { parsePagination } from "@/lib/pagination";
import { apiError, apiSuccess } from "@/lib/response";
import { listTeams } from "@/lib/repository";
import { safeServerErrorDetails } from "@/lib/safe-error-details";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { page, limit } = parsePagination(url.searchParams);
    const result = await listTeams({ page, limit });
    return apiSuccess(result);
  } catch (error) {
    return apiError(
      {
        code: "PUBLIC_TEAMS_LIST_FAILED",
        message: "Failed to list teams",
        details: safeServerErrorDetails(error),
      },
      500
    );
  }
}
