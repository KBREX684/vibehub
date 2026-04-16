import { z } from "zod";
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
  cursor: z.string().trim().max(200).optional(),
});

/** Anonymous-safe project list (P4-3). Same query params as `/api/v1/projects` GET. */
export async function GET(request: Request) {
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
    const { page, limit, query, tag, tech, team, status, cursor } = parsed.data;
    const result = await listProjects({ query, tag, tech, status, team, page, limit, cursor });
    return apiSuccess(result);
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
return apiError(
      {
        code: "PUBLIC_PROJECTS_LIST_FAILED",
        message: "Failed to list projects",
        details: safeServerErrorDetails(error),
      },
      500
    );
  }
}