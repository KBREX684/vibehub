import type { NextRequest } from "next/server";
import { getSessionUserFromCookie } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { getWorkspaceArtifactDownloadUrl } from "@/lib/repositories/workspace.repository";

interface Props {
  params: Promise<{ workspaceId: string; artifactId: string }>;
}

export async function GET(_request: NextRequest, { params }: Props) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  try {
    const { workspaceId, artifactId } = await params;
    const result = await getWorkspaceArtifactDownloadUrl({
      userId: session.userId,
      workspaceId,
      artifactId,
    });
    return apiSuccess(result);
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    const message = error instanceof Error ? error.message : "Failed to get workspace artifact download URL";
    return apiError({ code: "WORKSPACE_ARTIFACT_DOWNLOAD_URL_FAILED", message }, 500);
  }
}
