import { z } from "zod";
import { getSessionUserFromCookie } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { reviewTeamJoinRequest } from "@/lib/repository";

const bodySchema = z.object({
  action: z.enum(["approve", "reject"]),
});

interface Params {
  params: Promise<{ slug: string; requestId: string }>;
}

export async function POST(request: Request, { params }: Params) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  try {
    const { slug, requestId } = await params;
    const json = await request.json();
    const parsed = bodySchema.parse(json);
    const row = await reviewTeamJoinRequest({
      teamSlug: slug,
      requestId,
      ownerUserId: session.userId,
      action: parsed.action,
    });
    return apiSuccess(row);
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
if (error instanceof z.ZodError) {
      return apiError(
        {
          code: "INVALID_BODY",
          message: "action must be approve or reject",
          details: error.flatten(),
        },
        400
      );
    }
    const msg = error instanceof Error ? error.message : String(error);
    if (msg === "TEAM_NOT_FOUND") {
      return apiError({ code: "TEAM_NOT_FOUND", message: "Team not found" }, 404);
    }
    if (msg === "FORBIDDEN_NOT_OWNER") {
      return apiError({ code: "FORBIDDEN", message: "Only the team owner can review join requests" }, 403);
    }
    if (msg === "JOIN_REQUEST_NOT_FOUND") {
      return apiError({ code: "JOIN_REQUEST_NOT_FOUND", message: "Join request not found" }, 404);
    }
    if (msg === "JOIN_REQUEST_NOT_PENDING") {
      return apiError({ code: "JOIN_REQUEST_NOT_PENDING", message: "Join request is not pending" }, 409);
    }
    if (msg === "TEAM_ALREADY_MEMBER") {
      return apiError({ code: "TEAM_ALREADY_MEMBER", message: "User is already a member" }, 409);
    }
    return apiError(
      {
        code: "TEAM_JOIN_REVIEW_FAILED",
        message: "Failed to review join request",
      },
      500
    );
  }
}