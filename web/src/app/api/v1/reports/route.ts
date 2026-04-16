/**
 * S4-03: POST /api/v1/reports
 *
 * User-facing report submission endpoint.
 * Allows authenticated users to flag content (posts, projects, comments, users)
 * for moderation review.
 *
 * Required by launch-readiness-standard §2.1:
 * "举报、审核、封禁 / 限制的最小治理闭环存在"
 */
import { z } from "zod";
import { getSessionUserFromCookie } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { createReportTicket } from "@/lib/repository";
import { writeAuditLog } from "@/lib/audit";
import { readJsonObjectBody } from "@/lib/api-json-body";
import { apiErrorFromZod } from "@/lib/zod-api-error";

const reportBodySchema = z.object({
  targetType: z.enum(["post", "project", "comment", "user"]),
  targetId: z.string().min(1).max(100),
  reason: z.string().min(5, "Reason must be at least 5 characters").max(2000),
});

export async function POST(request: Request) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  const parsed = await readJsonObjectBody(request);
  if (!parsed.ok) return parsed.response;
  const zod = reportBodySchema.safeParse(parsed.body);
  if (!zod.success) return apiErrorFromZod(zod.error);

  const { targetType, targetId, reason } = zod.data;

  // Prevent self-report
  if (targetType === "user" && targetId === session.userId) {
    return apiError({ code: "CANNOT_REPORT_SELF", message: "You cannot report yourself" }, 400);
  }

  try {
    const ticket = await createReportTicket({
      reporterId: session.userId,
      targetType,
      targetId,
      reason,
    });

    // G-06: audit log for report submission
    void writeAuditLog({
      actorId: session.userId,
      action: "admin.action",
      entityType: "report_ticket",
      entityId: ticket.id,
      metadata: { targetType, targetId, reason: reason.substring(0, 200) },
    });

    return apiSuccess({ ticket }, 201);
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    const msg = error instanceof Error ? error.message : String(error);
    if (msg === "DUPLICATE_REPORT") {
      return apiError(
        { code: "DUPLICATE_REPORT", message: "You have already reported this content" },
        409
      );
    }
    if (msg === "INVALID_TARGET_TYPE") {
      return apiError(
        { code: "INVALID_TARGET_TYPE", message: "Target type must be post, project, comment, or user" },
        400
      );
    }
    return apiError(
      { code: "REPORT_FAILED", message: "Failed to submit report" },
      500
    );
  }
}
