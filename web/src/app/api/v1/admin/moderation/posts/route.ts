import { z } from "zod";
import { listPostsForModeration } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { requireAdminSession } from "@/lib/admin-auth";
import { safeServerErrorDetails } from "@/lib/safe-error-details";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["pending", "approved", "rejected", "all"]).default("all"),
  query: z.string().trim().max(200).optional(),
});

export async function GET(request: Request) {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return auth.response;
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
    const { page, limit, status, query } = parsed.data;

    const result = await listPostsForModeration({
      status,
      query,
      page,
      limit,
    });

    return apiSuccess(result);
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
return apiError(
      {
        code: "ADMIN_MODERATION_POSTS_FAILED",
        message: "Failed to list moderation posts",
        details: safeServerErrorDetails(error),
      },
      500
    );
  }
}