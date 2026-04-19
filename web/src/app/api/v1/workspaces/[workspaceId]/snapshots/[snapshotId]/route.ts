import type { NextRequest } from "next/server";
import { getSessionUserFromCookie } from "@/lib/auth";
import { getWorkspaceSnapshot } from "@/lib/repositories/workspace.repository";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";

interface Props {
  params: Promise<{ workspaceId: string; snapshotId: string }>;
}

export async function GET(_request: NextRequest, { params }: Props) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  try {
    const { workspaceId, snapshotId } = await params;
    const snapshot = await getWorkspaceSnapshot({ userId: session.userId, workspaceId, snapshotId });
    if (!snapshot) {
      return apiError({ code: "WORKSPACE_SNAPSHOT_NOT_FOUND", message: "Snapshot not found" }, 404);
    }
    return apiSuccess({ snapshot });
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    const message = error instanceof Error ? error.message : "Failed to get workspace snapshot";
    return apiError({ code: "WORKSPACE_SNAPSHOT_GET_FAILED", message }, 500);
  }
}
