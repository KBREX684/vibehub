import type { NextRequest } from "next/server";
import { authenticateRequest, rateLimitedResponse } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, "read:public");
  if (auth.kind === "rate_limited") {
    return rateLimitedResponse(auth.retryAfterSeconds);
  }
  if (auth.kind !== "ok") {
    return apiError({ code: "UNAUTHORIZED", message: "OAuth Bearer token required" }, 401);
  }
  return apiSuccess({
    user: {
      id: auth.user.userId,
      name: auth.user.name,
      role: auth.user.role,
      subscriptionTier: auth.user.subscriptionTier ?? "free",
      oauthAppId: auth.user.oauthAppId,
      oauthAppClientId: auth.user.oauthAppClientId,
      scopes: auth.user.apiKeyScopes ?? [],
    },
  });
}
