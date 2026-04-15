import { apiError, apiSuccess } from "@/lib/response";
import { getTopicDiscovery } from "@/lib/repository";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(_request: Request, context: RouteParams) {
  const { slug } = await context.params;
  const discovery = await getTopicDiscovery(slug);

  if (!discovery) {
    return apiError(
      {
        code: "TOPIC_NOT_FOUND",
        message: "Unknown collection topic slug",
        details: { slug },
      },
      404
    );
  }

  return apiSuccess(discovery);
}
