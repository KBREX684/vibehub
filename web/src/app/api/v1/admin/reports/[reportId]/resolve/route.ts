import { requireAdminSession } from "@/lib/admin-auth";
import { resolveReportTicket } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { safeServerErrorDetails } from "@/lib/safe-error-details";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  try {
    const { reportId } = await params;
    const ticket = await resolveReportTicket({
      ticketId: reportId,
      adminUserId: auth.session.userId,
    });
    return apiSuccess({ ticket });
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    const msg = error instanceof Error ? error.message : String(error);
    if (msg === "REPORT_TICKET_NOT_FOUND") {
      return apiError({ code: "REPORT_TICKET_NOT_FOUND", message: "Report ticket not found" }, 404);
    }
    return apiError(
      {
        code: "ADMIN_REPORT_RESOLVE_FAILED",
        message: "Failed to resolve report ticket",
        details: safeServerErrorDetails(error),
      },
      500
    );
  }
}
