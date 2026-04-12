import { listCreators } from "@/lib/repository";
import { parsePagination } from "@/lib/pagination";
import { apiError, apiSuccess } from "@/lib/response";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { page, limit } = parsePagination(url.searchParams);
    const query = url.searchParams.get("query") ?? undefined;
    const result = await listCreators({ query, page, limit });

    return apiSuccess({
      tool: "search_creators",
      input: { query, page, limit },
      output: result,
    });
  } catch (error) {
    return apiError(
      {
        code: "MCP_SEARCH_CREATORS_FAILED",
        message: "Failed to execute MCP tool search_creators",
        details: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}
