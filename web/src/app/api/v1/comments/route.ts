import { z } from "zod";
import { createComment, listCommentsForPost } from "@/lib/repository";
import { parsePagination } from "@/lib/pagination";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { getSessionUserFromCookie } from "@/lib/auth";
import { safeServerErrorDetails } from "@/lib/safe-error-details";

const createCommentSchema = z.object({
  postId: z.string().min(1),
  body: z.string().min(2).max(2000),
  parentCommentId: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const postId = url.searchParams.get("postId");
    if (!postId) {
      return apiError({ code: "MISSING_POST_ID", message: "postId query parameter is required" }, 400);
    }
    const { page, limit } = parsePagination(url.searchParams);
    const result = await listCommentsForPost({ postId, page, limit });
    return apiSuccess(result);
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
return apiError(
      {
        code: "COMMENTS_LIST_FAILED",
        message: "Failed to list comments",
        details: safeServerErrorDetails(error),
      },
      500
    );
  }
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUserFromCookie();
  if (!sessionUser) {
    return apiError(
      {
        code: "UNAUTHORIZED",
        message: "Login required",
      },
      401
    );
  }

  try {
    const json = await request.json();
    const parsed = createCommentSchema.parse(json);
    const comment = await createComment({
      ...parsed,
      authorId: sessionUser.userId,
    });

    return apiSuccess(comment, 201);
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
const message = error instanceof Error ? error.message : String(error);
    if (message === "POST_NOT_FOUND") {
      return apiError(
        {
          code: "POST_NOT_FOUND",
          message: "Cannot comment on a non-existent post",
        },
        404
      );
    }

    return apiError(
      {
        code: "COMMENT_CREATE_FAILED",
        message: "Failed to create comment",
      },
      400
    );
  }
}