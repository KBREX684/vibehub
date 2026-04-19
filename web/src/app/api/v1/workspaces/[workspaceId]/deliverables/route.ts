import { z } from "zod";
import type { NextRequest } from "next/server";
import { authenticateRequest, getSessionUserFromCookie, rateLimitedResponse } from "@/lib/auth";
import {
  createWorkspaceDeliverable,
  listWorkspaceDeliverables,
} from "@/lib/repositories/workspace.repository";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";

interface Props {
  params: Promise<{ workspaceId: string }>;
}

const createDeliverableSchema = z.object({
  snapshotId: z.string().trim().min(1),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional(),
});

export async function GET(_request: NextRequest, { params }: Props) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  try {
    const { workspaceId } = await params;
    const result = await listWorkspaceDeliverables({ userId: session.userId, workspaceId });
    return apiSuccess(result);
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    const message = error instanceof Error ? error.message : "Failed to list workspace deliverables";
    return apiError({ code: "WORKSPACE_DELIVERABLES_GET_FAILED", message }, 500);
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

  let parsed: z.infer<typeof createDeliverableSchema>;
  try {
    parsed = createDeliverableSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError({ code: "INVALID_BODY", message: "Invalid payload", details: error.flatten() }, 400);
    }
    return apiError({ code: "INVALID_BODY", message: "Invalid payload" }, 400);
  }

  try {
    const { workspaceId } = await params;
    const deliverable = await createWorkspaceDeliverable({
      userId: auth.user.userId,
      workspaceId,
      snapshotId: parsed.snapshotId,
      title: parsed.title,
      description: parsed.description,
    });
    return apiSuccess({ deliverable }, 201);
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    const message = error instanceof Error ? error.message : "Failed to create workspace deliverable";
    return apiError({ code: "WORKSPACE_DELIVERABLE_CREATE_FAILED", message }, 500);
  }
}
