import { z } from "zod";
import { getSessionUserFromCookie } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { reorderTeamTask } from "@/lib/repository";

const bodySchema = z.object({
  direction: z.enum(["up", "down"]),
});

interface Params {
  params: Promise<{ slug: string; taskId: string }>;
}

export async function POST(request: Request, { params }: Params) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  try {
    const { slug, taskId } = await params;
    const json = await request.json();
    const parsed = bodySchema.parse(json);
    const tasks = await reorderTeamTask({
      teamSlug: slug,
      taskId,
      actorUserId: session.userId,
      direction: parsed.direction,
    });
    return apiSuccess({ tasks });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError({ code: "INVALID_BODY", message: "direction must be up or down", details: error.flatten() }, 400);
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
    if (msg === "TEAM_TASK_REORDER_EDGE") {
      return apiError({ code: "TEAM_TASK_REORDER_EDGE", message: "Cannot move further in that direction" }, 400);
    }
    return apiError(
      {
        code: "TEAM_TASK_REORDER_FAILED",
        message: "Failed to reorder task",
        details: msg,
      },
      500
    );
  }
}
