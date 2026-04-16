import { z } from "zod";
import type { NextRequest } from "next/server";
import { authenticateRequest, rateLimitedResponse, resolveReadAuth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { apiErrorFromRepositoryMessage } from "@/lib/route-repository-message";
import { deleteTeamTask, updateTeamTask } from "@/lib/repository";
import type { TeamTaskStatus } from "@/lib/types";

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.union([z.string().max(2000), z.null()]).optional(),
  status: z.enum(["todo", "doing", "done"]).optional(),
  assigneeUserId: z.union([z.string().min(1), z.null()]).optional(),
  sortOrder: z.number().int().optional(),
  milestoneId: z.union([z.string().min(1), z.null()]).optional(),
});

interface Params {
  params: Promise<{ slug: string; taskId: string }>;
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
    const mapped = apiErrorFromRepositoryMessage(msg);
    if (mapped) return mapped;
    return apiError(
      {
        code: "TEAM_TASK_UPDATE_FAILED",
        message: "Failed to update team task",
      },
      500
    );
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
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
    await deleteTeamTask({ teamSlug: slug, taskId, actorUserId: session.userId });
    return apiSuccess({ ok: true });
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
const msg = error instanceof Error ? error.message : String(error);
    const mapped = apiErrorFromRepositoryMessage(msg);
    if (mapped) return mapped;
    return apiError(
      {
        code: "TEAM_TASK_DELETE_FAILED",
        message: "Failed to delete team task",
      },
      500
    );
  }
}