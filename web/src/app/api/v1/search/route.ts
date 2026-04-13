import type { NextRequest } from "next/server";
import { unifiedSearch } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";
import type { SearchResult } from "@/lib/types";

const VALID_TYPES = ["post", "project", "creator"] as const;
type SearchType = typeof VALID_TYPES[number];

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const rawType = url.searchParams.get("type") ?? "";
  const type: SearchType | undefined = VALID_TYPES.includes(rawType as SearchType) ? (rawType as SearchType) : undefined;

  if (rawType && !type) {
    return apiError({ code: "INVALID_TYPE", message: `type must be one of: ${VALID_TYPES.join(", ")}` }, 400);
  }
  if (!q || q.length < 2) {
    return apiSuccess({ results: [] as SearchResult[], query: q });
  }

  try {
    const results = await unifiedSearch(q, type);
    return apiSuccess({ results, query: q });
  } catch (err) {
    return apiError({ code: "SEARCH_FAILED", message: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
}
