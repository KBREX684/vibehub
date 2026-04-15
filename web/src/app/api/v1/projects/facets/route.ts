import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { getProjectFilterFacets } from "@/lib/repository";

export async function GET() {
  try {
    const facets = await getProjectFilterFacets();
    return apiSuccess(facets);
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
return apiError(
      {
        code: "PROJECT_FACETS_FAILED",
        message: "Failed to load project filter facets",
      },
      500
    );
  }
}