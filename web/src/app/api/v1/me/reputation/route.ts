import { getSessionUserFromCookie } from "@/lib/auth";
import { getContributionCredit, refreshContributionCredit } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";
import { safeServerErrorDetails } from "@/lib/safe-error-details";

export async function GET() {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  try {
    const credit = await getContributionCredit(session.userId);
    return apiSuccess(credit);
  } catch (error) {
    return apiError(
      { code: "REPUTATION_FETCH_FAILED", message: "Failed to fetch reputation", details: safeServerErrorDetails(error) },
      500
    );
  }
}

export async function POST() {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  try {
    const credit = await refreshContributionCredit(session.userId);
    return apiSuccess(credit);
  } catch (error) {
    return apiError(
      { code: "REPUTATION_REFRESH_FAILED", message: "Failed to refresh reputation", details: safeServerErrorDetails(error) },
      500
    );
  }
}
