import type { NextRequest } from "next/server";
import { z } from "zod";
import { unifiedSearch, unifiedSearchPaged } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { getRequestLogger, serializeError } from "@/lib/logger";
import type { SearchResult } from "@/lib/types";

const searchSchema = z.object({
  q: z.string().trim().max(200).default(""),
  type: z.enum(["post", "project", "creator"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function GET(request: NextRequest) {
  const requestLogger = getRequestLogger(request, { route: "/api/v1/search" });
  const url = new URL(request.url);
  const params: Record<string, string> = {};
  for (const [k, v] of url.searchParams.entries()) params[k] = v;
  const parsed = searchSchema.safeParse(params);
  if (!parsed.success) {
    return apiError(
      { code: "INVALID_QUERY_PARAMS", message: "Invalid search parameters", details: parsed.error.flatten().fieldErrors },
      400,
    );
  }
  const { q, type, page, limit } = parsed.data;

  if (!q || q.length < 2) {
    return apiSuccess({ results: [] as SearchResult[], total: 0, page, limit, query: q });
  }

  try {
    if (type) {
      const { results, total } = await unifiedSearchPaged({ query: q, type, page, limit });
      return apiSuccess({ results, total, page, limit, query: q });
    }
    const results = await unifiedSearch(q, type);
    return apiSuccess({ results, total: results.length, page: 1, limit: results.length, query: q });
  } catch (err) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(err);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    requestLogger.error({ err: serializeError(err) }, "Search route failed");
    return apiError({ code: "SEARCH_FAILED", message: "Search failed" }, 500);
  }
}
