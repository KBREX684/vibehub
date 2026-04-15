import { z } from "zod";
import type { NextRequest } from "next/server";
import { authenticateRequest, rateLimitedResponse, resolveReadAuth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { batchUpdateTeamTasks } from "@/lib/repository";
import type { TeamTaskStatus } from "@/lib/types";

const patchSchema = z.object({
  taskIds: z.array(z.string().min(1)).min(1).max(100),
  status: z.enum(["todo", "doing", "done"]),
});

interface Params {
  params: Promise<{ slug: string }>;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await authenticateRequest(request, "write:team:tasks");
  const gate = resolveReadAuth(auth, false);
  if (!gate.ok) {
    if (gate.status === 429) {
      return rateLimitedResponse(gate.retryAfterSeconds ?? 60);
    }
    return apiError({ code: "UNAUTHORIZED", message: "Session or API key with write:team:tasks required" }, 401);
  }
  const session = gate.user!;

  try {
    const { slug } = await params;
    const json = await request.json();
    const parsed = patchSchema.parse(json);
    const tasks = await batchUpdateTeamTasks({
      teamSlug: slug,
      actorUserId: session.userId,
      taskIds: parsed.taskIds,
      status: parsed.status as TeamTaskStatus,
    });
    return apiSuccess({ tasks });
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
if (error instanceof z.ZodError) {
      return apiError({ code: "INVALID_BODY", message: "Invalid batch payload", details: error.flatten() }, 400);
    }
    const msg = error instanceof Error ? error.message : String(error);
    if (msg === "TEAM_NOT_FOUND") {
      return apiError({ code: "TEAM_NOT_FOUND", message: "Team not found" }, 404);
    }
    if (msg === "FORBIDDEN_NOT_TEAM_MEMBER") {
      return apiError({ code: "FORBIDDEN", message: "Team members only" }, 403);
    }
    if (msg === "FORBIDDEN_BATCH_TASK_UPDATE") {
      return apiError({ code: "FORBIDDEN", message: "Only the team owner can run batch status updates" }, 403);
    }
    if (msg === "INVALID_TASK_STATUS") {
      return apiError({ code: "INVALID_TASK_STATUS", message: "status must be todo, doing, or done" }, 400);
    }
    return apiError(
      {
        code: "TEAM_TASKS_BATCH_FAILED",
        message: "Failed to update tasks",
        details: msg,
      },
      500
    );
  }
}