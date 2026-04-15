import { getProjectBySlug } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";

interface Params {
  params: Promise<{ slug: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  const { slug } = await params;
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

  return apiSuccess(project);
}
