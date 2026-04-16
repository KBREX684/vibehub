import { z } from "zod";
import { updateComment, deleteComment } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { apiErrorFromRepositoryMessage } from "@/lib/route-repository-message";
import { getSessionUserFromCookie } from "@/lib/auth";

const patchSchema = z.object({
  body: z.string().min(2),
});

interface Params {
  params: Promise<{ commentId: string }>;
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  try {
    const { commentId } = await params;
    const json = await request.json();
    const parsed = patchSchema.parse(json);
    const comment = await updateComment({
      commentId,
      actorUserId: session.userId,
      body: parsed.body,
    });
    return apiSuccess(comment);
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
const msg = error instanceof Error ? error.message : String(error);
    const mapped = apiErrorFromRepositoryMessage(msg);
    if (mapped) return mapped;
    return apiError(
      { code: "COMMENT_UPDATE_FAILED", message: "Failed to update comment" },
      400
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  try {
    const { commentId } = await params;
    await deleteComment({
      commentId,
      actorUserId: session.userId,
      actorRole: session.role,
    });
    return apiSuccess({ deleted: true });
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
const msg = error instanceof Error ? error.message : String(error);
    const mapped = apiErrorFromRepositoryMessage(msg);
    if (mapped) return mapped;
    return apiError(
      { code: "COMMENT_DELETE_FAILED", message: "Failed to delete comment" },
      500
    );
  }
}