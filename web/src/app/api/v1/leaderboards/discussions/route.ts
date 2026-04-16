import { apiError, apiSuccess } from "@/lib/response";
import { getDiscussionLeaderboard } from "@/lib/repository";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("limit");
  const limit = raw ? Number.parseInt(raw, 10) : 10;

  if (Number.isNaN(limit) || limit < 1) {
    return apiError(
      {
        code: "INVALID_LIMIT",
        message: "limit must be a positive integer",
      },
      400
    );
  }

  const MAX_LEADERBOARD_LIMIT = 100;
  const safeLimit = Math.min(limit, MAX_LEADERBOARD_LIMIT);
  const rows = await getDiscussionLeaderboard(safeLimit);
  return apiSuccess({ kind: "discussions_by_comment_count", rows });
}
