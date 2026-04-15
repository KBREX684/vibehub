import type { NextRequest } from "next/server";
import { authenticateRequest, rateLimitedResponse } from "@/lib/auth";
import { getUserSubscription } from "@/lib/repository";
import { getLimits, TIER_PRICING } from "@/lib/subscription";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { getRequestLogger, serializeError } from "@/lib/logger";

/** M-1: Get current user's subscription info + limits. */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth.kind === "rate_limited") return rateLimitedResponse(auth.retryAfterSeconds);
  if (auth.kind !== "ok") return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);

  try {
    const subscription = await getUserSubscription(auth.user.userId);
    const limits = getLimits(subscription.tier);
    const pricing = TIER_PRICING[subscription.tier];
    return apiSuccess({ subscription, limits, pricing });
  } catch (err) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(err);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    const log = getRequestLogger(request, { route: "GET /api/v1/me/subscription" });
    log.error({ err: serializeError(err) }, "subscription fetch failed");
    return apiError({ code: "SUBSCRIPTION_FETCH_FAILED", message: "Failed to load subscription" }, 500);
  }
}