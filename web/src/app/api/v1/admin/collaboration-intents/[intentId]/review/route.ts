import { z } from "zod";
import { reviewCollaborationIntent } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { apiErrorFromRepositoryMessage } from "@/lib/route-repository-message";
import { getSessionUserFromCookie } from "@/lib/auth";
import { requireAdminSession } from "@/lib/admin-auth";

const reviewSchema = z.object({
  action: z.enum(["approve", "reject"]),
  note: z.string().trim().max(500).optional(),
  /** When approving a join intent, add the applicant to the project’s linked team if within plan member limits */
  inviteApplicantToTeamOnApprove: z.boolean().optional(),
});

interface Params {
  params: Promise<{ intentId: string }>;
}

export async function POST(request: Request, { params }: Params) {
  const adminAuth = await requireAdminSession();
  let session = adminAuth.ok ? adminAuth.session : null;
  if (!session) {
    const cookieSession = await getSessionUserFromCookie();
    if (cookieSession?.role === "user") {
      session = cookieSession;
    } else {
      return adminAuth.response;
    }
  }

  try {
    const { intentId } = await params;
    const body = await request.json();
    const parsed = reviewSchema.parse(body);

    const reviewed = await reviewCollaborationIntent({
      intentId,
      action: parsed.action,
      note: parsed.note,
      adminUserId: session.userId,
      projectOwnerUserId: session.role === "user" ? session.userId : undefined,
      inviteApplicantToTeamOnApprove: parsed.inviteApplicantToTeamOnApprove,
    });

    return apiSuccess(reviewed);
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
const message = error instanceof Error ? error.message : String(error);
    const mapped = apiErrorFromRepositoryMessage(message);
    if (mapped) return mapped;
    return apiError(
      {
        code: "ADMIN_REVIEW_COLLABORATION_INTENT_FAILED",
        message: "Failed to review collaboration intent",
      },
      400
    );
  }
}