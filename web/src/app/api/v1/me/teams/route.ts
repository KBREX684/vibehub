import type { NextRequest } from "next/server";
import { authenticateRequest, rateLimitedResponse } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { listTeamsForUser } from "@/lib/repository";
import { safeServerErrorDetails } from "@/lib/safe-error-details";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, "read:teams:self");
  if (auth.kind === "rate_limited") {
    return rateLimitedResponse(auth.retryAfterSeconds);
  }
  if (auth.kind !== "ok") {
    return apiError({ code: "UNAUTHORIZED", message: "Login or API key with read:teams:self required" }, 401);
  }
  const session = auth.user;

  try {
    const teams = await listTeamsForUser(session.userId);
    return apiSuccess({ teams });
  } catch (error) {
    return apiError(
      {
        code: "ME_TEAMS_FAILED",
        message: "Failed to list teams for current user",
        details: safeServerErrorDetails(error),
      },
      500
    );
  }
}
