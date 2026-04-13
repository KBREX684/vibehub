import type { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { getCreatorBySlug } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";

interface Params {
  params: Promise<{ slug: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await authenticateRequest(request, "read:creators:detail");
  if (!auth) {
    return apiError({ code: "UNAUTHORIZED", message: "Login or API key with read:creators:detail required" }, 401);
  }

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
