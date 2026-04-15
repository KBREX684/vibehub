import type { NextRequest } from "next/server";
import { authenticateRequest, rateLimitedResponse, resolveReadAuth } from "@/lib/auth";
import { getProjectBySlug } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, "read:projects:detail");
  const gate = resolveReadAuth(auth, true);
  if (!gate.ok) {
    if (gate.status === 429) {
      return rateLimitedResponse(gate.retryAfterSeconds ?? 60);
    }
    return apiError({ code: "UNAUTHORIZED", message: "API key with read:projects:detail required" }, 401);
  }

  const url = new URL(request.url);
  const slug = url.searchParams.get("slug");

  if (!slug) {
    return apiError(
      {
        code: "MISSING_SLUG",
        message: "Query param slug is required",
      },
      400
    );
  }

  const project = await getProjectBySlug(slug);
  if (!project) {
    return apiError(
      {
        code: "PROJECT_NOT_FOUND",
        message: `Project "${slug}" not found`,
      },
      404
    );
  }

  return apiSuccess({
    tool: "get_project_detail",
    input: { slug },
    output: project,
  });
}
