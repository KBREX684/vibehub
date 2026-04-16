import { z } from "zod";
import { getSessionUserFromCookie } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { apiErrorFromRepositoryMessage } from "@/lib/route-repository-message";
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
    const mapped = apiErrorFromRepositoryMessage(msg);
    if (mapped) return mapped;
    return apiError(
      {
        code: "TEAM_JOIN_REVIEW_FAILED",
        message: "Failed to review join request",
      },
      500
    );
  }
}