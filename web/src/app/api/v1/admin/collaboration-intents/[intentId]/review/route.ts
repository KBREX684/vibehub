import { z } from "zod";
import { reviewCollaborationIntent } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";
import { getSessionUserFromCookie } from "@/lib/auth";
import { requireAdminSession } from "@/lib/admin-auth";

const reviewSchema = z.object({
  action: z.enum(["approve", "reject"]),
  note: z.string().trim().max(500).optional(),
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
    });

    return apiSuccess(reviewed);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "COLLABORATION_INTENT_NOT_FOUND") {
      return apiError(
        {
          code: "COLLABORATION_INTENT_NOT_FOUND",
          message: "Collaboration intent not found",
        },
        404
      );
    }
    if (message === "FORBIDDEN_NOT_PROJECT_OWNER") {
      return apiError(
        {
          code: "FORBIDDEN",
          message: "Only admins or the project owner can review this intent from the moderation queue",
        },
        403
      );
    }

    return apiError(
      {
        code: "ADMIN_REVIEW_COLLABORATION_INTENT_FAILED",
        message: "Failed to review collaboration intent",
        details: message,
      },
      400
    );
  }
}