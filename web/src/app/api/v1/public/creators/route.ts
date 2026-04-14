import { listCreators } from "@/lib/repository";
import { parsePagination } from "@/lib/pagination";
import { apiError, apiSuccess } from "@/lib/response";
import { safeServerErrorDetails } from "@/lib/safe-error-details";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { page, limit } = parsePagination(url.searchParams);
    const query = url.searchParams.get("query") ?? undefined;

    const result = await listCreators({ query, page, limit });
    return apiSuccess(result);
  } catch (error) {
    return apiError(
      {
        code: "PUBLIC_CREATORS_LIST_FAILED",
        message: "Failed to list creators",
        details: safeServerErrorDetails(error),
      },
      500
    );
  }
}
