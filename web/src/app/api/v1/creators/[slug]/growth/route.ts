import { getCreatorGrowthStats } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";

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
    return apiError(
      { code: "CREATOR_GROWTH_FAILED", message: "Failed to get creator growth stats", details: error instanceof Error ? error.message : String(error) },
      500
    );
  }
}
