import { z } from "zod";
import type { NextRequest } from "next/server";
import { authenticateRequest, rateLimitedResponse } from "@/lib/auth";
import { reviewCollaborationIntentByOwner } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { deprecatedResponse, isV11BackendLockdownEnabled } from "@/lib/v11-deprecation";

interface Props { params: Promise<{ slug: string; intentId: string }> }

const reviewSchema = z.object({
  action: z.enum(["approve", "reject"]),
  note: z.string().trim().max(500).optional(),
  /** When approving, optionally invite the applicant to this team */
  inviteToTeamSlug: z.string().optional(),
});

export async function POST(request: NextRequest, { params }: Props) {
  if (isV11BackendLockdownEnabled()) {
    return deprecatedResponse("INTENTS_DEPRECATED");
  }
  const auth = await authenticateRequest(request);
  if (auth.kind === "rate_limited") return rateLimitedResponse(auth.retryAfterSeconds);
  if (auth.kind !== "ok") return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);

  const { intentId } = await params;

  let body: unknown;
  try { body = await request.json(); } catch { return apiError({ code: "INVALID_JSON", message: "Invalid JSON" }, 400); }

  let parsed: z.infer<typeof reviewSchema>;
  try {
    parsed = reviewSchema.parse(body);
  } catch (err) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(err);
    if (repositoryErrorResponse) return repositoryErrorResponse;
if (err instanceof z.ZodError) return apiError({ code: "INVALID_BODY", message: "Invalid payload", details: err.flatten() }, 400);
    return apiError({ code: "INVALID_BODY", message: "Invalid payload" }, 400);
  }

  try {
    const intent = await reviewCollaborationIntentByOwner({
      intentId,
      ownerUserId: auth.user.userId,
      action: parsed.action,
      note: parsed.note,
      inviteToTeamSlug: parsed.inviteToTeamSlug,
    });
    return apiSuccess({ intent });
  } catch (err) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(err);
    if (repositoryErrorResponse) return repositoryErrorResponse;
const msg = err instanceof Error ? err.message : String(err);
    if (msg === "COLLABORATION_INTENT_NOT_FOUND") return apiError({ code: "COLLABORATION_INTENT_NOT_FOUND", message: "Intent not found" }, 404);
    if (msg === "FORBIDDEN_NOT_PROJECT_OWNER") return apiError({ code: "FORBIDDEN", message: "Only the project owner can review intents" }, 403);
    return apiError({ code: "REVIEW_FAILED", message: msg }, 500);
  }
}
