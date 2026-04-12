import { getSessionUserFromCookie } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { joinTeamAsMember } from "@/lib/repository";

interface Params {
  params: Promise<{ slug: string }>;
}

export async function POST(_request: Request, { params }: Params) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  try {
    const { slug } = await params;
    const member = await joinTeamAsMember({ teamSlug: slug, userId: session.userId });
    return apiSuccess(member, 201);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg === "TEAM_NOT_FOUND") {
      return apiError({ code: "TEAM_NOT_FOUND", message: "Team not found" }, 404);
    }
    if (msg === "USER_NOT_FOUND") {
      return apiError({ code: "USER_NOT_FOUND", message: "User not found" }, 404);
    }
    if (msg === "TEAM_ALREADY_MEMBER") {
      return apiError({ code: "TEAM_ALREADY_MEMBER", message: "Already a member of this team" }, 409);
    }
    return apiError(
      {
        code: "TEAM_JOIN_FAILED",
        message: "Failed to join team",
        details: msg,
      },
      500
    );
  }
}
