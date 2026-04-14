import { parsePagination } from "@/lib/pagination";
import { listAuditLogs } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";
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
    const actorId = url.searchParams.get("actorId") ?? undefined;
    const result = await listAuditLogs({ actorId, page, limit });
    return apiSuccess(result);
  } catch (error) {
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
