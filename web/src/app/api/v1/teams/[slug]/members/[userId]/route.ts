import { z } from "zod";
import { getSessionUserFromCookie } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { apiErrorFromRepositoryMessage } from "@/lib/route-repository-message";
import { removeTeamMember } from "@/lib/repository";
import { getRequestLogger, serializeError } from "@/lib/logger";

interface Params {
  params: Promise<{ slug: string; userId: string }>;
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  try {
    const { slug: rawSlug, userId: rawMemberId } = await params;
    const slugParse = z.string().min(1).safeParse(rawSlug);
    const memberParse = z.string().min(1).safeParse(rawMemberId);
    if (!slugParse.success || !memberParse.success) {
      return apiError({ code: "INVALID_PARAMS", message: "Invalid team or user id" }, 400);
    }
    const slug = slugParse.data;
    const userId = memberParse.data;
    await removeTeamMember({
      teamSlug: slug,
      actorUserId: session.userId,
      memberUserId: userId,
    });
    return apiSuccess({ ok: true });
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    const msg = error instanceof Error ? error.message : String(error);
    const mapped = apiErrorFromRepositoryMessage(msg);
    if (mapped) return mapped;
    const log = getRequestLogger(_request, { route: "DELETE /api/v1/teams/[slug]/members/[userId]" });
    log.error({ err: serializeError(error) }, "remove team member failed");
    return apiError(
      {
        code: "TEAM_MEMBER_REMOVE_FAILED",
        message: "Failed to remove team member",
      },
      500
    );
  }
}