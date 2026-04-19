import { z } from "zod";
import type { NextRequest } from "next/server";
import { authenticateRequest, getSessionUserFromCookie, rateLimitedResponse } from "@/lib/auth";
import { createWorkspaceSnapshot, listWorkspaceSnapshots } from "@/lib/repositories/workspace.repository";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";

interface Props {
  params: Promise<{ workspaceId: string }>;
}

const createSnapshotSchema = z.object({
  title: z.string().trim().min(1).max(120),
  summary: z.string().trim().min(1).max(500),
  goal: z.string().trim().max(500).optional(),
  roleNotes: z.string().trim().max(2000).optional(),
  previousSnapshotId: z.string().trim().optional(),
  projectIds: z.array(z.string().trim().min(1)).max(20).optional(),
});

export async function GET(_request: NextRequest, { params }: Props) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  try {
    const { workspaceId } = await params;
    const items = await listWorkspaceSnapshots({ userId: session.userId, workspaceId });
    return apiSuccess({ items });
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    const message = error instanceof Error ? error.message : "Failed to list workspace snapshots";
    return apiError({ code: "WORKSPACE_SNAPSHOTS_GET_FAILED", message }, 500);
  }
}

export async function POST(request: NextRequest, { params }: Props) {
  const auth = await authenticateRequest(request);
  if (auth.kind === "rate_limited") return rateLimitedResponse(auth.retryAfterSeconds);
  if (auth.kind !== "ok") {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError({ code: "INVALID_JSON", message: "Invalid JSON" }, 400);
  }

  let parsed: z.infer<typeof createSnapshotSchema>;
  try {
    parsed = createSnapshotSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError({ code: "INVALID_BODY", message: "Invalid payload", details: error.flatten() }, 400);
    }
    return apiError({ code: "INVALID_BODY", message: "Invalid payload" }, 400);
  }

  try {
    const { workspaceId } = await params;
    const snapshot = await createWorkspaceSnapshot({
      userId: auth.user.userId,
      workspaceId,
      title: parsed.title,
      summary: parsed.summary,
      goal: parsed.goal,
      roleNotes: parsed.roleNotes,
      previousSnapshotId: parsed.previousSnapshotId,
      projectIds: parsed.projectIds,
    });
    return apiSuccess({ snapshot }, 201);
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    const message = error instanceof Error ? error.message : "Failed to create workspace snapshot";
    return apiError({ code: "WORKSPACE_SNAPSHOT_CREATE_FAILED", message }, 500);
  }
}
