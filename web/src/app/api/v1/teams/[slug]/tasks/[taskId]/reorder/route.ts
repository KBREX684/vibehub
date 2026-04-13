import { z } from "zod";
import type { NextRequest } from "next/server";
import { authenticateRequest, rateLimitedResponse, resolveReadAuth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { reorderTeamTask } from "@/lib/repository";

const bodySchema = z.object({
  direction: z.enum(["up", "down"]),
});

interface Params {
  params: Promise<{ slug: string; taskId: string }>;
}

export async function POST(request: NextRequest, { params }: Params) {
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
    if (msg === "FORBIDDEN_TASK_UPDATE") {
      return apiError(
        { code: "FORBIDDEN", message: "Only task creator, assignee, or team owner may reorder this task" },
        403
      );
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
