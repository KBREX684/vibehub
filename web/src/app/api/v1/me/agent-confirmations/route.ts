import { z } from "zod";
import { getSessionUserFromCookie } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import {
  decideAgentConfirmationRequest,
  listAgentConfirmationRequestsForUser,
} from "@/lib/repository";

const patchSchema = z.object({
  requestId: z.string().min(1),
  decision: z.enum(["approved", "rejected"]),
});

export async function GET(request: Request) {
  const session = await getSessionUserFromCookie();
  if (!session) return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  try {
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? "20") || 20));
    const rawStatus = url.searchParams.get("status");
    const status = rawStatus === "pending" || rawStatus === "approved" || rawStatus === "rejected" || rawStatus === "canceled"
      ? rawStatus
      : undefined;
    const result = await listAgentConfirmationRequestsForUser({ userId: session.userId, page, limit, status });
    return apiSuccess({ items: result.items, pagination: result.pagination });
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    const msg = error instanceof Error ? error.message : String(error);
    return apiError({ code: "AGENT_CONFIRMATIONS_LIST_FAILED", message: "Failed to list agent confirmations", details: msg }, 500);
  }
}

export async function PATCH(request: Request) {
  const session = await getSessionUserFromCookie();
  if (!session) return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  try {
    const parsed = patchSchema.parse(await request.json());
    const item = await decideAgentConfirmationRequest({
      requestId: parsed.requestId,
      deciderUserId: session.userId,
      decision: parsed.decision,
    });
    return apiSuccess({ item });
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    if (error instanceof z.ZodError) {
      return apiError({ code: "INVALID_BODY", message: "Invalid confirmation payload", details: error.flatten() }, 400);
    }
    const msg = error instanceof Error ? error.message : String(error);
    if (msg === "AGENT_CONFIRMATION_NOT_FOUND") {
      return apiError({ code: msg, message: "Confirmation request not found" }, 404);
    }
    if (msg === "AGENT_CONFIRMATION_NOT_PENDING") {
      return apiError({ code: msg, message: "Confirmation request is no longer pending" }, 409);
    }
    if (msg === "FORBIDDEN_AGENT_CONFIRMATION" || msg === "FORBIDDEN_NOT_TEAM_MEMBER") {
      return apiError({ code: "FORBIDDEN", message: "You cannot decide this confirmation request" }, 403);
    }
    if (msg === "TEAM_TASK_NOT_FOUND") {
      return apiError({ code: msg, message: "Linked team task not found" }, 404);
    }
    return apiError({ code: "AGENT_CONFIRMATION_DECIDE_FAILED", message: "Failed to decide agent confirmation", details: msg }, 500);
  }
}
