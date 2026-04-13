import type { NextRequest } from "next/server";
import { authenticateRequest, rateLimitedResponse } from "@/lib/auth";
import { getMyBookmarks } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth.kind === "rate_limited") return rateLimitedResponse(auth.retryAfterSeconds);
  if (auth.kind !== "ok") return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  try {
    const bookmarks = await getMyBookmarks(auth.user.userId);
    return apiSuccess(bookmarks);
  } catch (err) {
    return apiError({ code: "BOOKMARKS_FETCH_FAILED", message: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
}
