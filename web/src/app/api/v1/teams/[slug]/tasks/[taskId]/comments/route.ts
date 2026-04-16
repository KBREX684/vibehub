import { z } from "zod";
import type { NextRequest } from "next/server";
import { authenticateRequest, rateLimitedResponse, resolveReadAuth } from "@/lib/auth";
import { createTeamTaskComment, listTeamTaskComments } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { safeServerErrorDetails } from "@/lib/safe-error-details";

const bodySchema = z.object({ body: z.string().min(1).max(2000) });

interface Params {
  params: Promise<{ slug: string; taskId: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await authenticateRequest(request, "read:team:tasks");
  const gate = resolveReadAuth(auth, false);
  if (!gate.ok) {
    if (gate.status === 429) return rateLimitedResponse(gate.retryAfterSeconds ?? 60);
    return apiError({ code: "UNAUTHORIZED", message: "Login or API key required" }, 401);
  }

  try {
    const { slug, taskId } = await params;
    const comments = await listTeamTaskComments({ teamSlug: slug, taskId, viewerUserId: gate.user!.userId });
    return apiSuccess({ comments });
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    return apiError(
      {
        code: "TEAM_TASK_COMMENTS_LIST_FAILED",
        message: "Failed to list task comments",
        details: safeServerErrorDetails(error),
      },
      500
    );
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await authenticateRequest(request);
  if (auth.kind === "rate_limited") return rateLimitedResponse(auth.retryAfterSeconds);
  if (auth.kind !== "ok") return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);

  try {
    const { slug, taskId } = await params;
    const parsed = bodySchema.parse(await request.json());
    const comment = await createTeamTaskComment({
      teamSlug: slug,
      taskId,
      actorUserId: auth.user.userId,
      body: parsed.body,
    });
    return apiSuccess({ comment }, 201);
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    if (error instanceof z.ZodError) {
      return apiError({ code: "INVALID_BODY", message: "Invalid payload", details: error.flatten() }, 400);
    }
    return apiError(
      {
        code: "TEAM_TASK_COMMENT_CREATE_FAILED",
        message: "Failed to create task comment",
        details: safeServerErrorDetails(error),
      },
      500
    );
  }
}
