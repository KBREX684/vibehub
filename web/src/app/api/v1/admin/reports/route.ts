import { parsePagination } from "@/lib/pagination";
import { listReportTickets } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";
import { requireAdminSession } from "@/lib/admin-auth";
import { safeServerErrorDetails } from "@/lib/safe-error-details";

function parseStatus(value: string | null): "open" | "resolved" | "all" {
  if (value === "open" || value === "resolved") {
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
