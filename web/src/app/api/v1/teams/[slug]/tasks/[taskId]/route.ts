import { z } from "zod";
import type { NextRequest } from "next/server";
import { authenticateRequest, rateLimitedResponse, resolveReadAuth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { agentCompleteTeamTask, deleteTeamTask, requestAgentTaskDelete, updateTeamTask } from "@/lib/repository";
import type { TeamTaskStatus } from "@/lib/types";
import { deprecatedResponse, isV11BackendLockdownEnabled } from "@/lib/v11-deprecation";

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.union([z.string().max(2000), z.null()]).optional(),
  status: z.enum(["todo", "doing", "review", "done", "rejected"]).optional(),
  assigneeUserId: z.union([z.string().min(1), z.null()]).optional(),
  sortOrder: z.number().int().optional(),
  milestoneId: z.union([z.string().min(1), z.null()]).optional(),
});

interface Params {
  params: Promise<{ slug: string; taskId: string }>;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  if (isV11BackendLockdownEnabled()) {
    return deprecatedResponse("TEAMS_DEPRECATED");
  }
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
    const parsed = patchSchema.parse(json);
    if (session.agentBindingId && parsed.status === "done") {
      const task = await agentCompleteTeamTask({
        teamSlug: slug,
        taskId,
        actorUserId: session.userId,
        agentBindingId: session.agentBindingId,
        apiKeyId: session.apiKeyId,
      });
      return apiSuccess(task);
    }
    if (session.agentBindingId && (parsed.status === "review" || parsed.status === "rejected")) {
      return apiError(
        {
          code: "FORBIDDEN",
          message: "Agent-bound keys must use the dedicated review tool for review/rejected transitions",
        },
        403
      );
    }
    const task = await updateTeamTask({
      teamSlug: slug,
      taskId,
      actorUserId: session.userId,
      title: parsed.title,
      description: parsed.description,
      status: parsed.status as TeamTaskStatus | undefined,
      assigneeUserId: parsed.assigneeUserId,
      sortOrder: parsed.sortOrder,
      milestoneId: parsed.milestoneId,
    });
    return apiSuccess(task);
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
    if (msg === "FORBIDDEN_TASK_UPDATE") {
      return apiError(
        { code: "FORBIDDEN", message: "Only task creator, assignee, reviewers, admins, or owners may update this task" },
        403
      );
    }
    if (msg === "TEAM_TASK_NOT_FOUND") {
      return apiError({ code: "TEAM_TASK_NOT_FOUND", message: "Task not found" }, 404);
    }
    if (msg === "INVALID_TASK_TITLE") {
      return apiError({ code: "INVALID_TASK_TITLE", message: "Title cannot be empty" }, 400);
    }
    if (msg === "INVALID_TASK_STATUS") {
      return apiError({ code: "INVALID_TASK_STATUS", message: "status must be todo, doing, review, done, or rejected" }, 400);
    }
    if (msg === "ASSIGNEE_NOT_TEAM_MEMBER") {
      return apiError({ code: "ASSIGNEE_NOT_TEAM_MEMBER", message: "Assignee must be a team member" }, 400);
    }
    if (msg === "TEAM_MILESTONE_NOT_FOUND") {
      return apiError({ code: "TEAM_MILESTONE_NOT_FOUND", message: "Milestone not found for this team" }, 400);
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

export async function DELETE(request: NextRequest, { params }: Params) {
  if (isV11BackendLockdownEnabled()) {
    return deprecatedResponse("TEAMS_DEPRECATED");
  }
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
    if (session.agentBindingId) {
      const requestItem = await requestAgentTaskDelete({
        teamSlug: slug,
        taskId,
        actorUserId: session.userId,
        agentBindingId: session.agentBindingId,
        apiKeyId: session.apiKeyId,
      });
      return apiSuccess({ confirmationRequired: true, request: requestItem }, 202);
    }
    await deleteTeamTask({ teamSlug: slug, taskId, actorUserId: session.userId });
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
    if (msg === "FORBIDDEN_TASK_DELETE") {
      return apiError({ code: "FORBIDDEN", message: "Only task creator, team admins, or owners may delete this task" }, 403);
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
