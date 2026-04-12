import { apiError, apiSuccess } from "@/lib/response";
import { getTeamBySlug } from "@/lib/repository";

interface Params {
  params: Promise<{ slug: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { slug } = await params;
    const team = await getTeamBySlug(slug);
    if (!team) {
      return apiError({ code: "TEAM_NOT_FOUND", message: "Team not found" }, 404);
    }
    return apiSuccess(team);
  } catch (error) {
    return apiError(
      {
        code: "TEAM_GET_FAILED",
        message: "Failed to load team",
        details: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}
