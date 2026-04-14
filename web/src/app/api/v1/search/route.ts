import type { NextRequest } from "next/server";
import { unifiedSearch, unifiedSearchPaged } from "@/lib/repository";
import { parsePagination } from "@/lib/pagination";
import { apiError, apiSuccess } from "@/lib/response";
import type { SearchResult } from "@/lib/types";

const VALID_TYPES = ["post", "project", "creator"] as const;
type SearchType = typeof VALID_TYPES[number];

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const { page, limit } = parsePagination(url.searchParams);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const rawType = url.searchParams.get("type") ?? "";
  const type: SearchType | undefined = VALID_TYPES.includes(rawType as SearchType) ? (rawType as SearchType) : undefined;

  if (rawType && !type) {
    return apiError({ code: "INVALID_TYPE", message: `type must be one of: ${VALID_TYPES.join(", ")}` }, 400);
  }
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
    return apiError({ code: "SEARCH_FAILED", message: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
}
