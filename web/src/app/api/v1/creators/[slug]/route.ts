import { getCreatorBySlug } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";

interface Params {
  params: Promise<{ slug: string }>;
}

export async function GET(_: Request, { params }: Params) {
  const { slug } = await params;
  const creator = await getCreatorBySlug(slug);

  if (!creator) {
    return apiError(
      {
        code: "CREATOR_NOT_FOUND",
        message: `Creator "${slug}" not found`,
      },
      404
    );
  }

  return apiSuccess(creator);
}
