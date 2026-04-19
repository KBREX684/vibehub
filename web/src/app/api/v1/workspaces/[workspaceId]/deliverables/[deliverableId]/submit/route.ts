import type { NextRequest } from "next/server";
import { authenticateRequest, rateLimitedResponse } from "@/lib/auth";
import { submitWorkspaceDeliverable } from "@/lib/repositories/workspace.repository";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";

interface Props {
  params: Promise<{ workspaceId: string; deliverableId: string }>;
}

export async function POST(request: NextRequest, { params }: Props) {
  const auth = await authenticateRequest(request);
  if (auth.kind === "rate_limited") return rateLimitedResponse(auth.retryAfterSeconds);
  if (auth.kind !== "ok") {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  try {
    const { workspaceId, deliverableId } = await params;
    const deliverable = await submitWorkspaceDeliverable({
      userId: auth.user.userId,
      workspaceId,
      deliverableId,
    });
    return apiSuccess({ deliverable });
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    const message = error instanceof Error ? error.message : "Failed to submit workspace deliverable";
    return apiError({ code: "WORKSPACE_DELIVERABLE_SUBMIT_FAILED", message }, 500);
  }
}
