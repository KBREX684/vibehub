import { z } from "zod";
import { getSessionUserFromCookie } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { requestTeamJoin } from "@/lib/repository";

const bodySchema = z.object({
  message: z.string().max(500).optional(),
});

interface Params {
  params: Promise<{ slug: string }>;
}

export async function POST(request: Request, { params }: Params) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  try {
    const { slug } = await params;
    let message: string | undefined;
    try {
      const json = await request.json();
      const parsed = bodySchema.parse(json);
      message = parsed.message;
    } catch {
      // empty body is ok
    }
    const row = await requestTeamJoin({ teamSlug: slug, userId: session.userId, message });
    return apiSuccess(row, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(
        {
          code: "INVALID_BODY",
          message: "Invalid join request payload",
          details: error.flatten(),
        },
        400
      );
    }
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
    if (msg === "TEAM_JOIN_REQUEST_PENDING") {
      return apiError(
        { code: "TEAM_JOIN_REQUEST_PENDING", message: "You already have a pending join request for this team" },
        409
      );
    }
    if (msg === "TEAM_OWNER_NO_REQUEST") {
      return apiError({ code: "TEAM_OWNER_NO_REQUEST", message: "Team owner does not need to request to join" }, 400);
    }
    return apiError(
      {
        code: "TEAM_JOIN_REQUEST_FAILED",
        message: "Failed to submit join request",
        details: msg,
      },
      500
    );
  }
}
