import { z } from "zod";
import type { NextRequest } from "next/server";
import { authenticateRequest, rateLimitedResponse } from "@/lib/auth";
import { reviewWorkspaceDeliverable } from "@/lib/repositories/workspace.repository";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";

interface Props {
  params: Promise<{ workspaceId: string; deliverableId: string }>;
}

const reviewSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
});

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

  let parsed: z.infer<typeof reviewSchema>;
  try {
    parsed = reviewSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError({ code: "INVALID_BODY", message: "Invalid payload", details: error.flatten() }, 400);
    }
    return apiError({ code: "INVALID_BODY", message: "Invalid payload" }, 400);
  }

  try {
    const { workspaceId, deliverableId } = await params;
    const deliverable = await reviewWorkspaceDeliverable({
      userId: auth.user.userId,
      workspaceId,
      deliverableId,
      decision: parsed.decision,
    });
    return apiSuccess({ deliverable });
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    const message = error instanceof Error ? error.message : "Failed to review workspace deliverable";
    return apiError({ code: "WORKSPACE_DELIVERABLE_REVIEW_FAILED", message }, 500);
  }
}
