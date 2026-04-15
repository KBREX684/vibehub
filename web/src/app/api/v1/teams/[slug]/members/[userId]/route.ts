import { getSessionUserFromCookie } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { removeTeamMember } from "@/lib/repository";

interface Params {
  params: Promise<{ slug: string; userId: string }>;
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  try {
    const { slug, userId } = await params;
    await removeTeamMember({
      teamSlug: slug,
      actorUserId: session.userId,
      memberUserId: userId,
    });
    return apiSuccess({ ok: true });
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
const msg = error instanceof Error ? error.message : String(error);
    if (msg === "TEAM_NOT_FOUND") {
      return apiError({ code: "TEAM_NOT_FOUND", message: "Team not found" }, 404);
    }
    if (msg === "MEMBERSHIP_NOT_FOUND") {
      return apiError({ code: "MEMBERSHIP_NOT_FOUND", message: "Membership not found" }, 404);
    }
    if (msg === "CANNOT_REMOVE_OWNER") {
      return apiError({ code: "CANNOT_REMOVE_OWNER", message: "Cannot remove the team owner" }, 400);
    }
    if (msg === "FORBIDDEN") {
      return apiError({ code: "FORBIDDEN", message: "Not allowed to remove this member" }, 403);
    }
    return apiError(
      {
        code: "TEAM_MEMBER_REMOVE_FAILED",
        message: "Failed to remove team member",
        details: msg,
      },
      500
    );
  }
}