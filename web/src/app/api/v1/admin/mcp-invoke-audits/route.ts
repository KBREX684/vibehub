import { parsePagination } from "@/lib/pagination";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { requireAdminSession } from "@/lib/admin-auth";
import { listMcpInvokeAudits } from "@/lib/repository";
import { safeServerErrorDetails } from "@/lib/safe-error-details";

export async function GET(request: Request) {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const url = new URL(request.url);
    const { page, limit } = parsePagination(url.searchParams);
    const result = await listMcpInvokeAudits({ page, limit });
    return apiSuccess({
      ...result,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.max(1, Math.ceil(result.total / limit)),
      },
    });
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
return apiError(
      {
        code: "ADMIN_MCP_AUDITS_FAILED",
        message: "Failed to list MCP invoke audits",
        details: safeServerErrorDetails(error),
      },
      500
    );
  }
}