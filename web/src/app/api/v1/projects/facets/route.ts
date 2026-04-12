import { apiError, apiSuccess } from "@/lib/response";
import { getProjectFilterFacets } from "@/lib/repository";

export async function GET() {
  try {
    const facets = await getProjectFilterFacets();
    return apiSuccess(facets);
  } catch (error) {
    return apiError(
      {
        code: "PROJECT_FACETS_FAILED",
        message: "Failed to load project filter facets",
        details: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}
