import type { NextRequest } from "next/server";
import { z } from "zod";
import { authenticateRequest, rateLimitedResponse, resolveReadAuth } from "@/lib/auth";
import { listProjects } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { safeServerErrorDetails } from "@/lib/safe-error-details";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  query: z.string().trim().max(200).optional(),
  tag: z.string().trim().max(100).optional(),
  tech: z.string().trim().max(100).optional(),
  team: z.string().trim().max(100).optional(),
  status: z.enum(["idea", "building", "launched", "paused"]).optional(),
});

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, "read:projects:list");
  const gate = resolveReadAuth(auth, true);
  if (!gate.ok) {
    if (gate.status === 429) {
      return rateLimitedResponse(gate.retryAfterSeconds ?? 60);
    }
    return apiError({ code: "UNAUTHORIZED", message: "API key with read:projects:list required" }, 401);
  }

  try {
    const url = new URL(request.url);
    const params: Record<string, string> = {};
    for (const [k, v] of url.searchParams.entries()) params[k] = v;
    const parsed = querySchema.safeParse(params);
    if (!parsed.success) {
      return apiError(
        { code: "INVALID_QUERY_PARAMS", message: "Invalid query parameters", details: parsed.error.flatten().fieldErrors },
        400,
      );
    }
    const { page, limit, query, tag, tech, team, status } = parsed.data;
    const result = await listProjects({ query, tag, tech, status, team, page, limit });

    return apiSuccess({
      tool: "search_projects",
      input: { query, tag, tech, status, team, page, limit },
      output: result,
    });
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
return apiError(
      {
        code: "MCP_SEARCH_PROJECTS_FAILED",
        message: "Failed to execute MCP tool search_projects",
        details: safeServerErrorDetails(error),
      },
      500
    );
  }
}