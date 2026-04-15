import { listCollaborationIntentsForModeration } from "@/lib/repository";
import { parsePagination } from "@/lib/pagination";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { requireAdminSession } from "@/lib/admin-auth";
import { safeServerErrorDetails } from "@/lib/safe-error-details";

export async function GET(request: Request) {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const url = new URL(request.url);
    const { page, limit } = parsePagination(url.searchParams);
    const statusRaw = url.searchParams.get("status");
    const projectId = url.searchParams.get("projectId") ?? undefined;

    const status =
      statusRaw === "pending" || statusRaw === "approved" || statusRaw === "rejected" || statusRaw === "all"
        ? statusRaw
        : "all";

    const result = await listCollaborationIntentsForModeration({
      status,
      projectId,
      page,
      limit,
    });

    return apiSuccess(result);
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
return apiError(
      {
        code: "ADMIN_COLLABORATION_INTENTS_LIST_FAILED",
        message: "Failed to list collaboration intents",
        details: safeServerErrorDetails(error),
      },
      500
    );
  }
}