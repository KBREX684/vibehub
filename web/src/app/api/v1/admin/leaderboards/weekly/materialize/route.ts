import { apiError, apiSuccess } from "@/lib/response";
import { requireAdminSession } from "@/lib/admin-auth";
import {
  materializeWeeklyLeaderboardSnapshot,
  parseUtcWeekStartParam,
  startOfUtcWeekContaining,
} from "@/lib/repository";
import type { WeeklyLeaderboardKind } from "@/lib/types";
import { safeServerErrorDetails } from "@/lib/safe-error-details";

const KINDS: WeeklyLeaderboardKind[] = [
  "discussions_by_weekly_comment_count",
  "projects_by_weekly_collaboration_intent_count",
];

function parseKind(value: unknown): WeeklyLeaderboardKind | null {
  if (typeof value !== "string") {
    return null;
  }
  return KINDS.includes(value as WeeklyLeaderboardKind) ? (value as WeeklyLeaderboardKind) : null;
}

export async function POST(request: Request) {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return auth.response;
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const weekRaw = typeof body.weekStart === "string" ? body.weekStart : undefined;
  const weekStart =
    weekRaw && weekRaw.trim()
      ? parseUtcWeekStartParam(weekRaw)
      : startOfUtcWeekContaining(new Date());

  if (!weekStart) {
    return apiError(
      {
        code: "INVALID_WEEK",
        message: "weekStart must be a Monday date in YYYY-MM-DD (UTC week)",
      },
      400
    );
  }

  const kind = parseKind(body.kind);
  if (!kind) {
    return apiError(
      {
        code: "INVALID_KIND",
        message: `kind must be one of: ${KINDS.join(", ")}`,
      },
      400
    );
  }

  const limitRaw = body.limit;
  const limit =
    typeof limitRaw === "number" && Number.isFinite(limitRaw)
      ? limitRaw
      : typeof limitRaw === "string"
        ? Number.parseInt(limitRaw, 10)
        : 15;

  if (Number.isNaN(limit) || limit < 1) {
    return apiError(
      {
        code: "INVALID_LIMIT",
        message: "limit must be a positive integer",
      },
      400
    );
  }

  try {
    const snapshot = await materializeWeeklyLeaderboardSnapshot({
      weekStart,
      kind,
      limit,
      actorId: auth.session.userId,
    });
    return apiSuccess(snapshot);
  } catch (error) {
    return apiError(
      {
        code: "MATERIALIZE_FAILED",
        message: "Failed to materialize weekly leaderboard",
        details: safeServerErrorDetails(error),
      },
      500
    );
  }
}
