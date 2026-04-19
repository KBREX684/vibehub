import { z } from "zod";
import type { NextRequest } from "next/server";
import { authenticateRequest, rateLimitedResponse } from "@/lib/auth";
import { rollbackWorkspaceSnapshot } from "@/lib/repositories/workspace.repository";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";

interface Props {
  params: Promise<{ workspaceId: string; snapshotId: string }>;
}

const rollbackSchema = z.object({
  title: z.string().trim().max(120).optional(),
  summary: z.string().trim().max(500).optional(),
  goal: z.string().trim().max(500).optional(),
  roleNotes: z.string().trim().max(2000).optional(),
});

export async function POST(request: NextRequest, { params }: Props) {
  const auth = await authenticateRequest(request);
  if (auth.kind === "rate_limited") return rateLimitedResponse(auth.retryAfterSeconds);
  if (auth.kind !== "ok") {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  let parsed: z.infer<typeof rollbackSchema>;
  try {
    parsed = rollbackSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError({ code: "INVALID_BODY", message: "Invalid payload", details: error.flatten() }, 400);
    }
    return apiError({ code: "INVALID_BODY", message: "Invalid payload" }, 400);
  }

  try {
    const { workspaceId, snapshotId } = await params;
    const snapshot = await rollbackWorkspaceSnapshot({
      userId: auth.user.userId,
      workspaceId,
      snapshotId,
      title: parsed.title,
      summary: parsed.summary,
      goal: parsed.goal,
      roleNotes: parsed.roleNotes,
    });
    return apiSuccess({ snapshot });
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    const message = error instanceof Error ? error.message : "Failed to roll back workspace snapshot";
    return apiError({ code: "WORKSPACE_SNAPSHOT_ROLLBACK_FAILED", message }, 500);
  }
}
