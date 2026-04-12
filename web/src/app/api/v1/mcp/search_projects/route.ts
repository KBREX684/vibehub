import { listProjects } from "@/lib/repository";
import { parsePagination } from "@/lib/pagination";
import { apiError, apiSuccess } from "@/lib/response";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { page, limit } = parsePagination(url.searchParams);
    const query = url.searchParams.get("query") ?? undefined;
    const tag = url.searchParams.get("tag") ?? undefined;

    const result = await listProjects({ query, tag, page, limit });

    return apiSuccess({
      tool: "search_projects",
      input: { query, tag, page, limit },
      output: result,
    });
  } catch (error) {
    return apiError(
      {
        code: "MCP_SEARCH_PROJECTS_FAILED",
        message: "Failed to execute MCP tool search_projects",
        details: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}
