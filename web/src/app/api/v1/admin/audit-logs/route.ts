import { parsePagination } from "@/lib/pagination";
import { listAuditLogs } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { requireAdminSession } from "@/lib/admin-auth";

export async function GET(request: Request) {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const url = new URL(request.url);
    const { page, limit } = parsePagination(url.searchParams);
    const actorId = url.searchParams.get("actorId") ?? undefined;
    const result = await listAuditLogs({ actorId, page, limit });
    return apiSuccess(result);
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
return apiError(
      {
        code: "ADMIN_AUDIT_LOGS_FAILED",
        message: "Failed to list audit logs",
        details: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}