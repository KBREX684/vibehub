import { listPosts } from "@/lib/repository";
import { parsePagination } from "@/lib/pagination";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { safeServerErrorDetails } from "@/lib/safe-error-details";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { page, limit } = parsePagination(url.searchParams);
    const result = await listPosts({ sort: "featured", featuredOnly: true, page, limit });
    return apiSuccess(result);
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    return apiError(
      {
        code: "FEATURED_LIST_FAILED",
        message: "Failed to list featured posts",
        details: safeServerErrorDetails(error),
      },
      500
    );
  }
}