import { parsePagination } from "@/lib/pagination";
import { listPostsForModeration } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { requireAdminSession } from "@/lib/admin-auth";
import type { ReviewStatus } from "@/lib/types";

function parseStatus(value: string | null): ReviewStatus | "all" {
  if (value === "approved" || value === "rejected" || value === "pending") {
    return value;
  }
  return "all";
}

export async function GET(request: Request) {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const url = new URL(request.url);
    const { page, limit } = parsePagination(url.searchParams);
    const status = parseStatus(url.searchParams.get("status"));
    const query = url.searchParams.get("query") ?? undefined;

    const result = await listPostsForModeration({
      status,
      query,
      page,
      limit,
    });

    return apiSuccess(result);
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
return apiError(
      {
        code: "ADMIN_MODERATION_POSTS_FAILED",
        message: "Failed to list moderation posts",
      },
      500
    );
  }
}