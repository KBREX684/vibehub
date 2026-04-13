import type { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { listTeamsForUser } from "@/lib/repository";

export async function GET(request: NextRequest) {
  const session = await authenticateRequest(request, "read:teams:self");
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  try {
    const teams = await listTeamsForUser(session.userId);
    return apiSuccess({ teams });
  } catch (error) {
    return apiError(
      {
        code: "ME_TEAMS_FAILED",
        message: "Failed to list teams for current user",
        details: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}
