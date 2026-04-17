import { parsePagination } from "@/lib/pagination";
import { listAuditLogs } from "@/lib/repository";
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
    const actorId = url.searchParams.get("actorId")?.trim() || undefined;
    const action = url.searchParams.get("action")?.trim() || undefined;
    const agentBindingId = url.searchParams.get("agentBindingId")?.trim() || undefined;
    const dateFrom = url.searchParams.get("dateFrom")?.trim() || undefined;
    const dateTo = url.searchParams.get("dateTo")?.trim() || undefined;
    const result = await listAuditLogs({ actorId, action, agentBindingId, dateFrom, dateTo, page, limit });
    return apiSuccess(result);
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    return apiError(
      {
        code: "ADMIN_AUDIT_LOGS_FAILED",
        message: "Failed to list audit logs",
        details: safeServerErrorDetails(error),
      },
      500
    );
  }
}
