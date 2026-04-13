import type { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { getTopicDiscovery } from "@/lib/repository";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(request: NextRequest, context: RouteParams) {
  const auth = await authenticateRequest(request, "read:topics:detail");
  if (!auth) {
    return apiError({ code: "UNAUTHORIZED", message: "Login or API key with read:topics:detail required" }, 401);
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
