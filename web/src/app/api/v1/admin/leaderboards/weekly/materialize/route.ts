import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { requireAdminSession } from "@/lib/admin-auth";
import {
  materializeWeeklyLeaderboardSnapshot,
  parseUtcWeekStartParam,
  startOfUtcWeekContaining,
} from "@/lib/repository";
import type { WeeklyLeaderboardKind } from "@/lib/types";
import { readJsonObjectBodyOrEmpty } from "@/lib/api-json-body";
import { apiErrorFromZod } from "@/lib/zod-api-error";
import { getRequestLogger, serializeError } from "@/lib/logger";
import { safeServerErrorDetails } from "@/lib/safe-error-details";

const KINDS: WeeklyLeaderboardKind[] = [
  "discussions_by_weekly_comment_count",
  "projects_by_weekly_collaboration_intent_count",
];

const materializeBodySchema = z.object({
  weekStart: z.string().trim().min(1).optional(),
  kind: z.enum(KINDS as [WeeklyLeaderboardKind, WeeklyLeaderboardKind]),
  limit: z.coerce.number().int().min(1).optional(),
});

export async function POST(request: Request) {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return auth.response;
  }

  const parsed = await readJsonObjectBodyOrEmpty(request);
  if (!parsed.ok) return parsed.response;
  const zod = materializeBodySchema.safeParse(parsed.body);
  if (!zod.success) return apiErrorFromZod(zod.error);
  const { weekStart: weekRaw, kind, limit: limitFromBody } = zod.data;

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

  const limit = limitFromBody ?? 15;

  try {
    const snapshot = await materializeWeeklyLeaderboardSnapshot({
      weekStart,
      kind,
      limit,
      actorId: auth.session.userId,
    });
    return apiSuccess(snapshot);
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    const log = getRequestLogger(request, { route: "POST /api/v1/admin/leaderboards/weekly/materialize" });
    log.error({ err: serializeError(error) }, "materialize weekly leaderboard failed");
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