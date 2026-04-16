import { z } from "zod";
import type { NextRequest } from "next/server";
import { authenticateRequest, rateLimitedResponse, resolveReadAuth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { apiErrorFromRepositoryMessage } from "@/lib/route-repository-message";
import { createTeamTask, listTeamTasks } from "@/lib/repository";
import type { TeamTaskStatus } from "@/lib/types";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  status: z.enum(["todo", "doing", "done"]).optional(),
  assigneeUserId: z.string().min(1).optional(),
  sortOrder: z.number().int().optional(),
  milestoneId: z.union([z.string().min(1), z.null()]).optional(),
});

interface Params {
  params: Promise<{ slug: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await authenticateRequest(request, "read:team:tasks");
  const gate = resolveReadAuth(auth, false);
  if (!gate.ok) {
    if (gate.status === 429) {
      return rateLimitedResponse(gate.retryAfterSeconds ?? 60);
    }
    return apiError({ code: "UNAUTHORIZED", message: "Login or API key with read:team:tasks required" }, 401);
  }
  const session = gate.user!;

  try {
    const { slug } = await params;
    const tasks = await listTeamTasks({ teamSlug: slug, viewerUserId: session.userId });
    return apiSuccess({ tasks });
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
const msg = error instanceof Error ? error.message : String(error);
    const mapped = apiErrorFromRepositoryMessage(msg);
    if (mapped) return mapped;
    return apiError(
      {
        code: "TEAM_TASKS_LIST_FAILED",
        message: "Failed to list team tasks",
      },
      500
    );
  }
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
      milestoneId: parsed.milestoneId,
    });
    return apiSuccess(task, 201);
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
if (error instanceof z.ZodError) {
      return apiError({ code: "INVALID_BODY", message: "Invalid task payload", details: error.flatten() }, 400);
    }
    const msg = error instanceof Error ? error.message : String(error);
    const mapped = apiErrorFromRepositoryMessage(msg);
    if (mapped) return mapped;
    return apiError(
      {
        code: "TEAM_TASK_CREATE_FAILED",
        message: "Failed to create team task",
      },
      500
    );
  }
}