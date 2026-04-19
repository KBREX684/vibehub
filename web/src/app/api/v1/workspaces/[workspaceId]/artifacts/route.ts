import { z } from "zod";
import type { NextRequest } from "next/server";
import { authenticateRequest, getSessionUserFromCookie, rateLimitedResponse } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import {
  listWorkspaceArtifacts,
  requestWorkspaceArtifactUpload,
} from "@/lib/repositories/workspace.repository";

interface Props {
  params: Promise<{ workspaceId: string }>;
}

const uploadRequestSchema = z.object({
  filename: z.string().trim().min(1).max(200),
  contentType: z.string().trim().min(1).max(200),
  sizeBytes: z.number().int().positive(),
});

export async function GET(_request: NextRequest, { params }: Props) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  try {
    const { workspaceId } = await params;
    const result = await listWorkspaceArtifacts({ userId: session.userId, workspaceId });
    return apiSuccess(result);
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    const message = error instanceof Error ? error.message : "Failed to list workspace artifacts";
    return apiError({ code: "WORKSPACE_ARTIFACTS_GET_FAILED", message }, 500);
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

  let parsed: z.infer<typeof uploadRequestSchema>;
  try {
    parsed = uploadRequestSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError({ code: "INVALID_BODY", message: "Invalid payload", details: error.flatten() }, 400);
    }
    return apiError({ code: "INVALID_BODY", message: "Invalid payload" }, 400);
  }

  try {
    const { workspaceId } = await params;
    const result = await requestWorkspaceArtifactUpload({
      userId: auth.user.userId,
      workspaceId,
      filename: parsed.filename,
      contentType: parsed.contentType,
      sizeBytes: parsed.sizeBytes,
    });
    return apiSuccess(result, 201);
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    const message = error instanceof Error ? error.message : "Failed to request workspace artifact upload";
    return apiError({ code: "WORKSPACE_ARTIFACT_UPLOAD_REQUEST_FAILED", message }, 500);
  }
}
