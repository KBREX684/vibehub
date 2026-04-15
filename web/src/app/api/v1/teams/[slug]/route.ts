import type { NextRequest } from "next/server";
import { authenticateRequest, rateLimitedResponse, resolveReadAuth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { getTeamBySlug } from "@/lib/repository";

interface Params {
  params: Promise<{ slug: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await authenticateRequest(request, "read:team:detail");
  const gate = resolveReadAuth(auth, true);
  if (!gate.ok) {
    if (gate.status === 429) {
      return rateLimitedResponse(gate.retryAfterSeconds ?? 60);
    }
    return apiError({ code: "UNAUTHORIZED", message: "API key with read:team:detail required" }, 401);
  }

  try {
    const { slug } = await params;
    const team = await getTeamBySlug(slug, gate.user?.userId ?? null);
    if (!team) {
      return apiError({ code: "TEAM_NOT_FOUND", message: "Team not found" }, 404);
    }
    return apiSuccess(team);
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
return apiError(
      {
        code: "TEAM_GET_FAILED",
        message: "Failed to load team",
      },
      500
    );
  }
}