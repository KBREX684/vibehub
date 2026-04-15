import { getCreatorGrowthStats } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";

interface Params {
  params: Promise<{ slug: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { slug } = await params;
    const stats = await getCreatorGrowthStats(slug);
    if (!stats) {
      return apiError({ code: "CREATOR_NOT_FOUND", message: `Creator "${slug}" not found` }, 404);
    }
    return apiSuccess(stats);
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
return apiError(
      { code: "CREATOR_GROWTH_FAILED", message: "Failed to get creator growth stats" },
      500
    );
  }
}