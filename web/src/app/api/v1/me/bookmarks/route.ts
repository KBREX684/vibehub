import type { NextRequest } from "next/server";
import { authenticateRequest, rateLimitedResponse } from "@/lib/auth";
import { getMyBookmarks } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { getRequestLogger, serializeError } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth.kind === "rate_limited") return rateLimitedResponse(auth.retryAfterSeconds);
  if (auth.kind !== "ok") return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  try {
    const bookmarks = await getMyBookmarks(auth.user.userId);
    return apiSuccess(bookmarks);
  } catch (err) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(err);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    const log = getRequestLogger(request, { route: "GET /api/v1/me/bookmarks" });
    log.error({ err: serializeError(err) }, "bookmarks fetch failed");
    return apiError({ code: "BOOKMARKS_FETCH_FAILED", message: "Failed to load bookmarks" }, 500);
  }
}