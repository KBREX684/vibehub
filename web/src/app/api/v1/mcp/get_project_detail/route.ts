import { getProjectBySlug } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";

export async function GET(request: Request) {
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
