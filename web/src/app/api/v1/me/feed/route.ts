import type { NextRequest } from "next/server";
import { authenticateRequest, rateLimitedResponse } from "@/lib/auth";
import { getFollowFeed, listFeaturedProjects, listPosts } from "@/lib/repository";
import { parsePagination } from "@/lib/pagination";
import { apiError, apiSuccess } from "@/lib/response";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth.kind === "rate_limited") return rateLimitedResponse(auth.retryAfterSeconds);

  const url = new URL(request.url);
  const { page, limit } = parsePagination(url.searchParams);

  try {
    if (auth.kind === "ok") {
      // Authenticated: return follow feed + featured projects
      const [feed, featured] = await Promise.all([
        getFollowFeed(auth.user.userId, { page, limit }),
        listFeaturedProjects(),
      ]);
      return apiSuccess({ feed, featuredProjects: featured });
    } else {
      // Anonymous: return latest posts + featured projects
      const [posts, featured] = await Promise.all([
        listPosts({ page, limit }),
        listFeaturedProjects(),
      ]);
      return apiSuccess({ feed: posts, featuredProjects: featured });
    }
  } catch (err) {
    return apiError({ code: "FEED_FETCH_FAILED", message: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
}
