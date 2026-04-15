import { z } from "zod";
import { getSessionUserFromCookie } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
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
    if (msg === "TEAM_NOT_FOUND") {
      return apiError({ code: "TEAM_NOT_FOUND", message: "Team not found" }, 404);
    }
    if (msg === "FORBIDDEN_NOT_OWNER") {
      return apiError({ code: "FORBIDDEN", message: "Only the team owner can add members by email" }, 403);
    }
    if (msg === "USER_NOT_FOUND") {
      return apiError({ code: "USER_NOT_FOUND", message: "No user with that email" }, 404);
    }
    if (msg === "TEAM_ALREADY_MEMBER") {
      return apiError({ code: "TEAM_ALREADY_MEMBER", message: "User is already a member" }, 409);
    }
    if (msg === "INVALID_EMAIL") {
      return apiError({ code: "INVALID_EMAIL", message: "Invalid email" }, 400);
    }
    return apiError(
      {
        code: "TEAM_MEMBER_ADD_FAILED",
        message: "Failed to add team member",
        details: msg,
      },
      500
    );
  }
}