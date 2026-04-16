import { apiError, apiSuccess } from "@/lib/response";
import { getWeeklyLeaderboardPublicPayload, parseUtcWeekStartParam, startOfUtcWeekContaining } from "@/lib/repository";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limitRaw = searchParams.get("limit");
  const limit = limitRaw ? Number.parseInt(limitRaw, 10) : 10;
  const weekParam = searchParams.get("week");

  if (Number.isNaN(limit) || limit < 1) {
    return apiError(
      {
        code: "INVALID_LIMIT",
        message: "limit must be a positive integer",
      },
      400
    );
  }

  const weekStart =
    weekParam && weekParam.trim()
      ? parseUtcWeekStartParam(weekParam)
      : startOfUtcWeekContaining(new Date());

  if (!weekStart) {
    return apiError(
      {
        code: "INVALID_WEEK",
        message: "week must be a Monday date in YYYY-MM-DD (UTC week)",
      },
      400
    );
  }

  const MAX_LEADERBOARD_LIMIT = 100;
  const safeLimit = Math.min(limit, MAX_LEADERBOARD_LIMIT);
  const payload = await getWeeklyLeaderboardPublicPayload({
    weekStart,
    kind: "projects_by_weekly_collaboration_intent_count",
    limit: safeLimit,
  });

  return apiSuccess(payload);
}
