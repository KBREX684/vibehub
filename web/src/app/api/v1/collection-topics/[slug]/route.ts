import type { NextRequest } from "next/server";
import { authenticateRequest, rateLimitedResponse, resolveReadAuth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { getTopicDiscovery } from "@/lib/repository";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(request: NextRequest, context: RouteParams) {
  const auth = await authenticateRequest(request, "read:topics:detail");
  const gate = resolveReadAuth(auth, true);
  if (!gate.ok) {
    if (gate.status === 429) {
      return rateLimitedResponse(gate.retryAfterSeconds ?? 60);
    }
    return apiError({ code: "UNAUTHORIZED", message: "API key with read:topics:detail required" }, 401);
  }

  const { slug } = await context.params;
  const discovery = await getTopicDiscovery(slug);

  if (!discovery) {
    return apiError(
      {
        code: "TOPIC_NOT_FOUND",
        message: "Unknown collection topic slug",
        details: { slug },
      },
      404
    );
  }

  return apiSuccess(discovery);
}
