import { parsePagination } from "@/lib/pagination";
import { listEnterpriseVerificationApplications } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";
import { requireAdminSession } from "@/lib/admin-auth";
import type { EnterpriseVerificationStatus } from "@/lib/types";

const ALLOWED_STATUS = new Set<EnterpriseVerificationStatus | "all">([
  "all",
  "none",
  "pending",
  "approved",
  "rejected",
]);

export async function GET(request: Request) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(request.url);
    const { page, limit } = parsePagination(url.searchParams);
    const rawStatus = (url.searchParams.get("status") ?? "all").trim().toLowerCase();
    if (!ALLOWED_STATUS.has(rawStatus as EnterpriseVerificationStatus | "all")) {
      return apiError(
        {
          code: "INVALID_STATUS",
          message: "status must be one of: all, none, pending, approved, rejected",
        },
        400
      );
    }
    const status = rawStatus as EnterpriseVerificationStatus | "all";
    const result = await listEnterpriseVerificationApplications({ status, page, limit });
    return apiSuccess(result);
  } catch (error) {
    return apiError(
      {
        code: "ADMIN_ENTERPRISE_VERIFICATIONS_LIST_FAILED",
        message: "Failed to list enterprise verification applications",
        details: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}
