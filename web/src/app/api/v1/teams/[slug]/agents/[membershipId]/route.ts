import { z } from "zod";
import { getSessionUserFromCookie } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import {
  removeTeamAgentMembership,
  updateTeamAgentMembership,
} from "@/lib/repository";
import { safeServerErrorDetails } from "@/lib/safe-error-details";

const patchSchema = z.object({
  role: z
    .enum(["reader", "commenter", "executor", "reviewer", "coordinator"])
    .optional(),
  active: z.boolean().optional(),
});

interface Params {
  params: Promise<{ slug: string; membershipId: string }>;
}

function mapManageError(message: string) {
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
          message: "Only team owners and admins can manage team agents",
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
    case "TEAM_AGENT_NOT_FOUND":
      return apiError(
        { code: message, message: "Team agent membership not found" },
        404
      );
    case "INVALID_TEAM_AGENT_ROLE":
      return apiError(
        { code: message, message: "Unknown team agent role" },
        400
      );
    default:
      return null;
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }
  try {
    const { slug, membershipId } = await params;
    const json = await request.json();
    const parsed = patchSchema.parse(json);
    const membership = await updateTeamAgentMembership({
      teamSlug: slug,
      actorUserId: session.userId,
      membershipId,
      role: parsed.role,
      active: parsed.active,
    });
    return apiSuccess({ membership });
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
    const mapped = mapManageError(message);
    if (mapped) return mapped;
    return apiError(
      {
        code: "TEAM_AGENT_UPDATE_FAILED",
        message: "Failed to update team agent",
        details: safeServerErrorDetails(error),
      },
      500
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }
  try {
    const { slug, membershipId } = await params;
    await removeTeamAgentMembership({
      teamSlug: slug,
      actorUserId: session.userId,
      membershipId,
    });
    return apiSuccess({ removed: true });
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    const message = error instanceof Error ? error.message : String(error);
    const mapped = mapManageError(message);
    if (mapped) return mapped;
    return apiError(
      {
        code: "TEAM_AGENT_REMOVE_FAILED",
        message: "Failed to remove team agent",
        details: safeServerErrorDetails(error),
      },
      500
    );
  }
}
