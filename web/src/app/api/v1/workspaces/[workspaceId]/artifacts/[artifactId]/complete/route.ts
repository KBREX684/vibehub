import type { NextRequest } from "next/server";
import { authenticateRequest, rateLimitedResponse } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { completeWorkspaceArtifactUpload } from "@/lib/repositories/workspace.repository";

interface Props {
  params: Promise<{ workspaceId: string; artifactId: string }>;
}

export async function POST(request: NextRequest, { params }: Props) {
  const auth = await authenticateRequest(request);
  if (auth.kind === "rate_limited") return rateLimitedResponse(auth.retryAfterSeconds);
  if (auth.kind !== "ok") {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  try {
    const { workspaceId, artifactId } = await params;
    const artifact = await completeWorkspaceArtifactUpload({
      userId: auth.user.userId,
      workspaceId,
      artifactId,
    });
    return apiSuccess({ artifact });
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    const message = error instanceof Error ? error.message : "Failed to complete workspace artifact upload";
    return apiError({ code: "WORKSPACE_ARTIFACT_COMPLETE_FAILED", message }, 500);
  }
}
