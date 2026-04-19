import { z } from "zod";
import { getSessionUserFromCookie } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { addTeamAgentMembership, listTeamAgentMemberships } from "@/lib/repository";
import { safeServerErrorDetails } from "@/lib/safe-error-details";
import {
  deprecatedResponse,
  isV11BackendLockdownEnabled,
  withDeprecatedHeaders,
} from "@/lib/v11-deprecation";

/**
 * v8 W3 — Team Agent Bus
 *
 * GET  /api/v1/teams/{slug}/agents       — list agents in the team
 * POST /api/v1/teams/{slug}/agents       — add an agent (owner/admin only)
 *
 * Per-agent PATCH / DELETE lives under `[membershipId]/route.ts`.
 */

const postSchema = z.object({
  agentBindingId: z.string().min(1).max(64),
  role: z
    .enum(["reader", "commenter", "executor", "reviewer", "coordinator"])
    .optional(),
});

interface Params {
  params: Promise<{ slug: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }
  try {
    const { slug } = await params;
    const memberships = await listTeamAgentMemberships({
      teamSlug: slug,
      viewerUserId: session.userId,
    });
    return withDeprecatedHeaders(apiSuccess({ memberships }));
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    const message = error instanceof Error ? error.message : String(error);
    if (message === "TEAM_NOT_FOUND") {
      return apiError({ code: message, message: "Team not found" }, 404);
    }
    if (message === "FORBIDDEN_NOT_TEAM_MEMBER") {
      return apiError(
        { code: message, message: "Only team members can view team agents" },
        403
      );
    }
    return apiError(
      {
        code: "TEAM_AGENTS_LIST_FAILED",
        message: "Failed to list team agents",
        details: safeServerErrorDetails(error),
      },
      500
    );
  }
}

export async function POST(request: Request, { params }: Params) {
  if (isV11BackendLockdownEnabled()) {
    return deprecatedResponse("TEAMS_DEPRECATED");
  }
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }
  try {
    const { slug } = await params;
    const json = await request.json();
    const parsed = postSchema.parse(json);
    const membership = await addTeamAgentMembership({
      teamSlug: slug,
      actorUserId: session.userId,
      agentBindingId: parsed.agentBindingId,
      role: parsed.role,
    });
    return apiSuccess({ membership }, 201);
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    if (error instanceof z.ZodError) {
      return apiError(
        {
          code: "INVALID_BODY",
          message: "Invalid payload",
          details: error.flatten(),
        },
        400
      );
    }
    const message = error instanceof Error ? error.message : String(error);
    switch (message) {
      case "TEAM_NOT_FOUND":
        return apiError({ code: message, message: "Team not found" }, 404);
      case "FORBIDDEN_NOT_TEAM_MEMBER":
        return apiError(
          { code: message, message: "Only team members can manage agents" },
          403
        );
      case "FORBIDDEN_TEAM_AGENT_MANAGE":
        return apiError(
          {
            code: message,
            message: "Only team owners and admins can add agents to a team",
          },
          403
        );
      case "FORBIDDEN_TEAM_AGENT_COORDINATOR":
        return apiError(
          {
            code: message,
            message:
              "Only team owners and admins can grant the coordinator role",
          },
          403
        );
      case "AGENT_BINDING_NOT_FOUND":
        return apiError({ code: message, message: "Agent binding not found" }, 404);
      case "AGENT_BINDING_INACTIVE":
        return apiError(
          { code: message, message: "Agent binding is paused" },
          409
        );
      case "AGENT_OWNER_NOT_TEAM_MEMBER":
        return apiError(
          {
            code: message,
            message:
              "The owner of this agent is not a member of the team — add them first",
          },
          409
        );
      case "TEAM_AGENT_ALREADY_MEMBER":
        return apiError(
          { code: message, message: "This agent is already in the team" },
          409
        );
      case "INVALID_TEAM_AGENT_ROLE":
        return apiError(
          { code: message, message: "Unknown team agent role" },
          400
        );
      default:
        return apiError(
          {
            code: "TEAM_AGENT_ADD_FAILED",
            message: "Failed to add team agent",
            details: safeServerErrorDetails(error),
          },
          500
        );
    }
  }
}
