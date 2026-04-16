import { z } from "zod";
import type { NextRequest } from "next/server";
import { authenticateRequest, rateLimitedResponse } from "@/lib/auth";
import { reviewCollaborationIntentByOwner } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { apiErrorFromRepositoryMessage } from "@/lib/route-repository-message";

interface Props { params: Promise<{ slug: string; intentId: string }> }

const reviewSchema = z.object({
  action: z.enum(["approve", "reject"]),
  note: z.string().trim().max(500).optional(),
  /** When approving, optionally invite the applicant to this team */
  inviteToTeamSlug: z.string().optional(),
});

export async function POST(request: NextRequest, { params }: Props) {
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
    const mapped = apiErrorFromRepositoryMessage(msg);
    if (mapped) return mapped;
    return apiError({ code: "REVIEW_FAILED", message: msg }, 500);
  }
}