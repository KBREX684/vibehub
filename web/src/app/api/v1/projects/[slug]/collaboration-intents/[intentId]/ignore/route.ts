import type { NextRequest } from "next/server";
import { z } from "zod";
import { authenticateRequest, rateLimitedResponse } from "@/lib/auth";
import { ignoreCollaborationIntentByOwner } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";

interface Props {
  params: Promise<{ slug: string; intentId: string }>;
}

const ignoreSchema = z.object({
  note: z.string().trim().max(500).optional(),
});

export async function POST(request: NextRequest, { params }: Props) {
  const auth = await authenticateRequest(request);
  if (auth.kind === "rate_limited") return rateLimitedResponse(auth.retryAfterSeconds);
  if (auth.kind !== "ok") return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);

  const { intentId } = await params;

  let body: unknown = {};
  try {
    body = await request.json().catch(() => ({}));
  } catch {
    body = {};
  }

  let parsed: z.infer<typeof ignoreSchema>;
  try {
    parsed = ignoreSchema.parse(body);
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    if (error instanceof z.ZodError) {
      return apiError({ code: "INVALID_BODY", message: "Invalid payload", details: error.flatten() }, 400);
    }
    return apiError({ code: "INVALID_BODY", message: "Invalid payload" }, 400);
  }

  try {
    const intent = await ignoreCollaborationIntentByOwner({
      intentId,
      ownerUserId: auth.user.userId,
      note: parsed.note,
    });
    return apiSuccess({ intent });
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    const message = error instanceof Error ? error.message : String(error);
    if (message === "COLLABORATION_INTENT_NOT_FOUND") {
      return apiError({ code: "COLLABORATION_INTENT_NOT_FOUND", message: "Intent not found" }, 404);
    }
    if (message === "FORBIDDEN_NOT_PROJECT_OWNER") {
      return apiError({ code: "FORBIDDEN", message: "Only the project owner can update intents" }, 403);
    }
    return apiError({ code: "IGNORE_FAILED", message }, 500);
  }
}
