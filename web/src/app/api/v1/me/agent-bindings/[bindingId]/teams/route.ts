import { getSessionUserFromCookie } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { listTeamAgentMembershipsForBinding } from "@/lib/repository";
import { safeServerErrorDetails } from "@/lib/safe-error-details";

interface Params {
  params: Promise<{ bindingId: string }>;
}

/**
 * v8 W3 — returns the teams this binding participates in, so the
 * `/settings/agents` page can show role cards per team without a
 * secondary lookup per binding.
 */
export async function GET(_request: Request, { params }: Params) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }
  try {
    const { bindingId } = await params;
    const memberships = await listTeamAgentMembershipsForBinding({
      userId: session.userId,
      agentBindingId: bindingId,
    });
    return apiSuccess({ memberships });
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    const message = error instanceof Error ? error.message : String(error);
    if (message === "AGENT_BINDING_NOT_FOUND") {
      return apiError({ code: message, message: "Agent binding not found" }, 404);
    }
    return apiError(
      {
        code: "AGENT_BINDING_TEAMS_LIST_FAILED",
        message: "Failed to list teams for agent binding",
        details: safeServerErrorDetails(error),
      },
      500
    );
  }
}
