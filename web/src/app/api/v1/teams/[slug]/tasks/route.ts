import { z } from "zod";
import { getSessionUserFromCookie } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { createTeamTask, listTeamTasks } from "@/lib/repository";
import type { TeamTaskStatus } from "@/lib/types";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  status: z.enum(["todo", "doing", "done"]).optional(),
  assigneeUserId: z.string().min(1).optional(),
  sortOrder: z.number().int().optional(),
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
    const tasks = await listTeamTasks({ teamSlug: slug, viewerUserId: session.userId });
    return apiSuccess({ tasks });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg === "TEAM_NOT_FOUND") {
      return apiError({ code: "TEAM_NOT_FOUND", message: "Team not found" }, 404);
    }
    if (msg === "FORBIDDEN_NOT_TEAM_MEMBER") {
      return apiError({ code: "FORBIDDEN", message: "Team members only" }, 403);
    }
    return apiError(
      {
        code: "TEAM_TASKS_LIST_FAILED",
        message: "Failed to list team tasks",
        details: msg,
      },
      500
    );
  }
}

export async function POST(request: Request, { params }: Params) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  try {
    const { slug } = await params;
    const json = await request.json();
    const parsed = createSchema.parse(json);
    const task = await createTeamTask({
      teamSlug: slug,
      actorUserId: session.userId,
      title: parsed.title,
      description: parsed.description,
      status: parsed.status as TeamTaskStatus | undefined,
      assigneeUserId: parsed.assigneeUserId,
      sortOrder: parsed.sortOrder,
    });
    return apiSuccess(task, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError({ code: "INVALID_BODY", message: "Invalid task payload", details: error.flatten() }, 400);
    }
    const msg = error instanceof Error ? error.message : String(error);
    if (msg === "TEAM_NOT_FOUND") {
      return apiError({ code: "TEAM_NOT_FOUND", message: "Team not found" }, 404);
    }
    if (msg === "FORBIDDEN_NOT_TEAM_MEMBER") {
      return apiError({ code: "FORBIDDEN", message: "Team members only" }, 403);
    }
    if (msg === "INVALID_TASK_TITLE") {
      return apiError({ code: "INVALID_TASK_TITLE", message: "Title is required" }, 400);
    }
    if (msg === "ASSIGNEE_NOT_TEAM_MEMBER") {
      return apiError({ code: "ASSIGNEE_NOT_TEAM_MEMBER", message: "Assignee must be a team member" }, 400);
    }
    return apiError(
      {
        code: "TEAM_TASK_CREATE_FAILED",
        message: "Failed to create team task",
        details: msg,
      },
      500
    );
  }
}
