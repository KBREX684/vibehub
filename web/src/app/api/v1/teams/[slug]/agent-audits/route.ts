import { getSessionUserFromCookie } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { listAgentActionAuditsForTeam } from "@/lib/repository";
import { safeServerErrorDetails } from "@/lib/safe-error-details";

interface Params {
  params: Promise<{ slug: string }>;
}

export async function GET(request: Request, { params }: Params) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }
  try {
    const { slug } = await params;
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number(url.searchParams.get("limit") ?? "20") || 20)
    );
    const agentBindingId =
      url.searchParams.get("agentBindingId")?.trim() || undefined;
    const result = await listAgentActionAuditsForTeam({
      teamSlug: slug,
      viewerUserId: session.userId,
      page,
      limit,
      agentBindingId,
    });
    return apiSuccess({ items: result.items, pagination: result.pagination });
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    const message = error instanceof Error ? error.message : String(error);
    if (message === "TEAM_NOT_FOUND") {
      return apiError({ code: message, message: "Team not found" }, 404);
    }
    if (message === "FORBIDDEN_NOT_TEAM_MEMBER") {
      return apiError(
        { code: message, message: "Only team members can view agent audits" },
        403
      );
    }
    return apiError(
      {
        code: "TEAM_AGENT_AUDITS_LIST_FAILED",
        message: "Failed to list team agent audits",
        details: safeServerErrorDetails(error),
      },
      500
    );
  }
}
