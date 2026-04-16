import { z } from "zod";
import { getSessionUserFromCookie } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { apiErrorFromRepositoryMessage } from "@/lib/route-repository-message";
import { requestTeamJoin } from "@/lib/repository";

const bodySchema = z.object({
  message: z.string().max(500).optional(),
});

interface Params {
  params: Promise<{ slug: string }>;
}

export async function POST(request: Request, { params }: Params) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  try {
    const { slug } = await params;
    let message: string | undefined;
    try {
      const json = await request.json();
      const parsed = bodySchema.parse(json);
      message = parsed.message;
    } catch {
      // empty body is ok
    }
    const row = await requestTeamJoin({ teamSlug: slug, userId: session.userId, message });
    return apiSuccess(row, 201);
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
if (error instanceof z.ZodError) {
      return apiError(
        {
          code: "INVALID_BODY",
          message: "Invalid join request payload",
          details: error.flatten(),
        },
        400
      );
    }
    const msg = error instanceof Error ? error.message : String(error);
    const mapped = apiErrorFromRepositoryMessage(msg);
    if (mapped) return mapped;
    return apiError(
      {
        code: "TEAM_JOIN_REQUEST_FAILED",
        message: "Failed to submit join request",
      },
      500
    );
  }
}