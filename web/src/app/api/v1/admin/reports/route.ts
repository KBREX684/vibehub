import { parsePagination } from "@/lib/pagination";
import { listReportTickets } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { requireAdminSession } from "@/lib/admin-auth";
import { safeServerErrorDetails } from "@/lib/safe-error-details";

function parseStatus(value: string | null): "open" | "closed" | "all" {
  if (value === "open" || value === "closed") {
    return value;
  }
  return "all";
}

export async function GET(request: Request) {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const url = new URL(request.url);
    const { page, limit } = parsePagination(url.searchParams);
    const status = parseStatus(url.searchParams.get("status"));
    const result = await listReportTickets({ status, page, limit });
    return apiSuccess(result);
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
return apiError(
      {
        code: "ADMIN_REPORTS_LIST_FAILED",
        message: "Failed to list report tickets",
        details: safeServerErrorDetails(error),
      },
      500
    );
  }
}