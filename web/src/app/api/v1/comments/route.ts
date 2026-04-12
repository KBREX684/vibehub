import { z } from "zod";
import { createComment } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";
import { getSessionUserFromCookie } from "@/lib/auth";

const createCommentSchema = z.object({
  postId: z.string().min(1),
  body: z.string().min(2),
});

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
    return apiError(
      {
        code: "COMMENT_CREATE_FAILED",
        message: "Failed to create comment",
        details: error instanceof Error ? error.message : String(error),
      },
      400
    );
  }
}
