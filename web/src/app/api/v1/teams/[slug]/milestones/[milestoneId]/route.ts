import { z } from "zod";
import { getSessionUserFromCookie } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { deleteTeamMilestone, updateTeamMilestone } from "@/lib/repository";

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.union([z.string().max(2000), z.null()]).optional(),
  targetDate: z.string().min(1).optional(),
  completed: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  visibility: z.enum(["team_only", "public"]).optional(),
  progress: z.number().int().min(0).max(100).optional(),
});

interface Params {
  params: Promise<{ slug: string; milestoneId: string }>;
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  try {
    const { slug, milestoneId } = await params;
    const json = await request.json();
    const parsed = patchSchema.parse(json);
    const m = await updateTeamMilestone({
      teamSlug: slug,
      milestoneId,
      actorUserId: session.userId,
      title: parsed.title,
      description: parsed.description,
      targetDate: parsed.targetDate,
      completed: parsed.completed,
      sortOrder: parsed.sortOrder,
      visibility: parsed.visibility,
      progress: parsed.progress,
    });
    return apiSuccess(m);
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
if (error instanceof z.ZodError) {
      return apiError({ code: "INVALID_BODY", message: "Invalid payload", details: error.flatten() }, 400);
    }
    const msg = error instanceof Error ? error.message : String(error);
    if (msg === "TEAM_NOT_FOUND") {
      return apiError({ code: "TEAM_NOT_FOUND", message: "Team not found" }, 404);
    }
    if (msg === "FORBIDDEN_NOT_TEAM_MEMBER") {
      return apiError({ code: "FORBIDDEN", message: "Team members only" }, 403);
    }
    if (msg === "FORBIDDEN_MILESTONE_MEMBER_EDIT") {
      return apiError(
        { code: "FORBIDDEN", message: "Only team owners or admins can edit milestone details; members and reviewers may update progress only" },
        403
      );
    }
    if (msg === "TEAM_MILESTONE_NOT_FOUND") {
      return apiError({ code: "TEAM_MILESTONE_NOT_FOUND", message: "Milestone not found" }, 404);
    }
    if (msg === "INVALID_MILESTONE_TITLE") {
      return apiError({ code: "INVALID_MILESTONE_TITLE", message: "Title cannot be empty" }, 400);
    }
    if (msg === "INVALID_MILESTONE_DATE") {
      return apiError({ code: "INVALID_MILESTONE_DATE", message: "targetDate must be a valid ISO date" }, 400);
    }
    return apiError(
      {
        code: "TEAM_MILESTONE_UPDATE_FAILED",
        message: "Failed to update milestone",
        details: msg,
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
    const { slug, milestoneId } = await params;
    await deleteTeamMilestone({ teamSlug: slug, milestoneId, actorUserId: session.userId });
    return apiSuccess({ ok: true });
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
const msg = error instanceof Error ? error.message : String(error);
    if (msg === "TEAM_NOT_FOUND") {
      return apiError({ code: "TEAM_NOT_FOUND", message: "Team not found" }, 404);
    }
    if (msg === "FORBIDDEN_NOT_TEAM_MEMBER") {
      return apiError({ code: "FORBIDDEN", message: "Team members only" }, 403);
    }
    if (msg === "FORBIDDEN_NOT_OWNER") {
      return apiError({ code: "FORBIDDEN", message: "Only team owners or admins can delete milestones" }, 403);
    }
    if (msg === "TEAM_MILESTONE_NOT_FOUND") {
      return apiError({ code: "TEAM_MILESTONE_NOT_FOUND", message: "Milestone not found" }, 404);
    }
    return apiError(
      {
        code: "TEAM_MILESTONE_DELETE_FAILED",
        message: "Failed to delete milestone",
        details: msg,
      },
      500
    );
  }
}
