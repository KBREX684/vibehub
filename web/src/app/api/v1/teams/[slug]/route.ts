import type { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { getTeamBySlug } from "@/lib/repository";

interface Params {
  params: Promise<{ slug: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await authenticateRequest(request, "read:team:detail");
  if (!auth) {
    return apiError({ code: "UNAUTHORIZED", message: "Login or API key with read:team:detail required" }, 401);
  }

  try {
    const { slug } = await params;
    const team = await getTeamBySlug(slug, auth.userId);
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
