import { z } from "zod";
import { getSessionUserFromCookie } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { getProjectBySlug, updateProjectTeamLink } from "@/lib/repository";

const patchSchema = z.object({
  teamSlug: z.union([z.string().min(1).max(48), z.null()]).optional(),
});

interface Params {
  params: Promise<{ slug: string }>;
}

export async function GET(_: Request, { params }: Params) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);

  if (!project) {
    return apiError(
      {
        code: "PROJECT_NOT_FOUND",
        message: `Project "${slug}" not found`,
      },
      404
    );
  }

  return apiSuccess(project);
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  try {
    const { slug } = await params;
    const json = await request.json();
    const parsed = patchSchema.parse(json);
    if (parsed.teamSlug === undefined) {
      return apiError({ code: "INVALID_BODY", message: "teamSlug is required (string or null to unlink)" }, 400);
    }
    const project = await updateProjectTeamLink({
      projectSlug: slug,
      actorUserId: session.userId,
      teamSlug: parsed.teamSlug,
    });
    return apiSuccess(project);
  } catch (error) {
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
    const msg = error instanceof Error ? error.message : String(error);
    if (msg === "PROJECT_NOT_FOUND") {
      return apiError({ code: "PROJECT_NOT_FOUND", message: "Project not found" }, 404);
    }
    if (msg === "TEAM_NOT_FOUND") {
      return apiError({ code: "TEAM_NOT_FOUND", message: "Team not found" }, 404);
    }
    if (msg === "FORBIDDEN_NOT_CREATOR") {
      return apiError({ code: "FORBIDDEN", message: "Only the project creator can link a team" }, 403);
    }
    if (msg === "FORBIDDEN_NOT_TEAM_MEMBER") {
      return apiError(
        { code: "FORBIDDEN", message: "You must be a member of the team to link it to your project" },
        403
      );
    }
    return apiError(
      {
        code: "PROJECT_UPDATE_FAILED",
        message: "Failed to update project",
        details: msg,
      },
      500
    );
  }
}
