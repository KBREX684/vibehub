import { z } from "zod";
import { parsePagination } from "@/lib/pagination";
import {
  listEnterpriseProfiles,
  reviewEnterpriseVerification,
} from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { requireAdminSession } from "@/lib/admin-auth";
import type { EnterpriseVerificationStatus } from "@/lib/types";

const ALLOWED_STATUS = new Set<EnterpriseVerificationStatus | "all">([
  "all",
  "none",
  "pending",
  "approved",
  "rejected",
]);

const reviewBodySchema = z.object({
  // For the single-profile flow: userId identifies the applicant's profile.
  // For backward compat the field is named applicationId in the request
  // but maps to the profile's userId.
  applicationId: z.string().min(1),
  action: z.enum(["approve", "reject"]),
  note: z.string().max(1000).optional(),
});

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
    // Use the profile-based listing (backed by mockEnterpriseProfiles / User table)
    const result = await listEnterpriseProfiles({ status, page, limit });
    // Normalize shape: expose id=userId so callers can pass it back to POST
    const normalized = {
      ...result,
      items: result.items.map((p) => ({ ...p, id: p.userId })),
    };
    return apiSuccess(normalized);
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
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

export async function POST(request: Request) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  try {
    const parsed = reviewBodySchema.parse(await request.json());
    // applicationId = userId of the applicant profile
    const profile = await reviewEnterpriseVerification({
      userId: parsed.applicationId,
      adminUserId: auth.session.userId,
      action: parsed.action,
      reviewNote: parsed.note,
    });
    return apiSuccess({ ...profile, id: profile.userId });
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
if (error instanceof z.ZodError) {
      return apiError(
        {
          code: "INVALID_BODY",
          message: "Invalid review payload",
          details: error.flatten(),
        },
        400
      );
    }
    const msg = error instanceof Error ? error.message : String(error);
    if (msg === "ENTERPRISE_PROFILE_NOT_FOUND" || msg === "APPLICATION_NOT_FOUND") {
      return apiError({ code: "APPLICATION_NOT_FOUND", message: "Enterprise profile not found" }, 404);
    }
    if (msg === "ENTERPRISE_PROFILE_NOT_PENDING" || msg === "APPLICATION_NOT_PENDING") {
      return apiError(
        { code: "APPLICATION_NOT_PENDING", message: "Profile is not pending review" },
        409
      );
    }
    return apiError(
      {
        code: "ADMIN_ENTERPRISE_VERIFICATION_REVIEW_FAILED",
        message: "Failed to review enterprise verification",
        details: msg,
      },
      500
    );
  }
}