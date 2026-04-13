import type { NextRequest } from "next/server";
import { authenticateRequest, rateLimitedResponse, resolveReadAuth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { listCollectionTopics } from "@/lib/repository";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, "read:topics:list");
  const gate = resolveReadAuth(auth, true);
  if (!gate.ok) {
    if (gate.status === 429) {
      return rateLimitedResponse(gate.retryAfterSeconds ?? 60);
    }
    return apiError({ code: "UNAUTHORIZED", message: "API key with read:topics:list required" }, 401);
  }

  const topics = listCollectionTopics();
  return apiSuccess({ topics });
}
