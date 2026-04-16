import { z } from "zod";
import { getSessionUserFromCookie } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { apiErrorFromRepositoryMessage } from "@/lib/route-repository-message";
import { addTeamMemberByEmail } from "@/lib/repository";

const bodySchema = z.object({
  email: z.string().email(),
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
    const json = await request.json();
    const parsed = bodySchema.parse(json);
    const member = await addTeamMemberByEmail({
      teamSlug: slug,
      actorUserId: session.userId,
      email: parsed.email,
    });
    return apiSuccess(member, 201);
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
if (error instanceof z.ZodError) {
      return apiError(
        {
          code: "INVALID_BODY",
          message: "email is required and must be valid",
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
        code: "TEAM_MEMBER_ADD_FAILED",
        message: "Failed to add team member",
      },
      500
    );
  }
}