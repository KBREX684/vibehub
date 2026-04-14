import { apiError, apiSuccess } from "@/lib/response";
import { getTeamBySlug } from "@/lib/repository";
import { safeServerErrorDetails } from "@/lib/safe-error-details";

interface Params {
  params: Promise<{ slug: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { slug } = await params;
    const team = await getTeamBySlug(slug, null);
    if (!team) {
      return apiError({ code: "TEAM_NOT_FOUND", message: "Team not found" }, 404);
    }
    return apiSuccess(team);
  } catch (error) {
    return apiError(
      {
        code: "PUBLIC_TEAM_GET_FAILED",
        message: "Failed to load team",
        details: safeServerErrorDetails(error),
      },
      500
    );
  }
}
