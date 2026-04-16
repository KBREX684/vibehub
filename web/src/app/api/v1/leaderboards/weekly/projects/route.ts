import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/response";
import { getWeeklyLeaderboardPublicPayload, parseUtcWeekStartParam, startOfUtcWeekContaining } from "@/lib/repository";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
  week: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "week must be YYYY-MM-DD").optional(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const params: Record<string, string> = {};
  for (const [k, v] of searchParams.entries()) params[k] = v;
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    return apiError(
      { code: "INVALID_QUERY_PARAMS", message: "Invalid query parameters", details: parsed.error.flatten().fieldErrors },
      400,
    );
  }
  const { limit, week: weekParam } = parsed.data;

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

  const payload = await getWeeklyLeaderboardPublicPayload({
    weekStart,
    kind: "projects_by_weekly_collaboration_intent_count",
    limit,
  });

  return apiSuccess(payload);
}
