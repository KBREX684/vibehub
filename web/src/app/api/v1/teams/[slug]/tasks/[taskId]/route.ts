import { z } from "zod";
import { getSessionUserFromCookie } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { deleteTeamTask, updateTeamTask } from "@/lib/repository";
import type { TeamTaskStatus } from "@/lib/types";

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.union([z.string().max(2000), z.null()]).optional(),
  status: z.enum(["todo", "doing", "done"]).optional(),
  assigneeUserId: z.union([z.string().min(1), z.null()]).optional(),
  sortOrder: z.number().int().optional(),
});

interface Params {
  params: Promise<{ slug: string; taskId: string }>;
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  try {
    const { slug, taskId } = await params;
    const json = await request.json();
    const parsed = patchSchema.parse(json);
    const task = await updateTeamTask({
      teamSlug: slug,
      taskId,
      actorUserId: session.userId,
      title: parsed.title,
      description: parsed.description,
      status: parsed.status as TeamTaskStatus | undefined,
      assigneeUserId: parsed.assigneeUserId,
      sortOrder: parsed.sortOrder,
    });
    return apiSuccess(task);
  } catch (error) {
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
    if (msg === "TEAM_TASK_NOT_FOUND") {
      return apiError({ code: "TEAM_TASK_NOT_FOUND", message: "Task not found" }, 404);
    }
    if (msg === "INVALID_TASK_TITLE") {
      return apiError({ code: "INVALID_TASK_TITLE", message: "Title cannot be empty" }, 400);
    }
    if (msg === "INVALID_TASK_STATUS") {
      return apiError({ code: "INVALID_TASK_STATUS", message: "status must be todo, doing, or done" }, 400);
    }
    if (msg === "ASSIGNEE_NOT_TEAM_MEMBER") {
      return apiError({ code: "ASSIGNEE_NOT_TEAM_MEMBER", message: "Assignee must be a team member" }, 400);
    }
    return apiError(
      {
        code: "TEAM_TASK_UPDATE_FAILED",
        message: "Failed to update team task",
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
    const { slug, taskId } = await params;
    await deleteTeamTask({ teamSlug: slug, taskId, actorUserId: session.userId });
    return apiSuccess({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg === "TEAM_NOT_FOUND") {
      return apiError({ code: "TEAM_NOT_FOUND", message: "Team not found" }, 404);
    }
    if (msg === "FORBIDDEN_NOT_TEAM_MEMBER") {
      return apiError({ code: "FORBIDDEN", message: "Team members only" }, 403);
    }
    if (msg === "TEAM_TASK_NOT_FOUND") {
      return apiError({ code: "TEAM_TASK_NOT_FOUND", message: "Task not found" }, 404);
    }
    return apiError(
      {
        code: "TEAM_TASK_DELETE_FAILED",
        message: "Failed to delete team task",
        details: msg,
      },
      500
    );
  }
}
