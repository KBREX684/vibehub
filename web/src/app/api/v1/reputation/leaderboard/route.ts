import { listContributionLeaderboard } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";
import { safeServerErrorDetails } from "@/lib/safe-error-details";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "20", 10) || 20, 1), 100);
    const leaderboard = await listContributionLeaderboard(limit);
    return apiSuccess(leaderboard);
  } catch (error) {
    return apiError(
      { code: "REPUTATION_LEADERBOARD_FAILED", message: "Failed to fetch leaderboard", details: safeServerErrorDetails(error) },
      500
    );
  }
}
