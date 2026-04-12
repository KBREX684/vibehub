import { z } from "zod";
import { reviewPost } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";
import { requireAdminSession } from "@/lib/admin-auth";

const reviewSchema = z.object({
  action: z.enum(["approve", "reject"]),
  note: z.string().max(500).optional(),
});

interface Params {
  params: Promise<{ postId: string }>;
}

export async function POST(request: Request, { params }: Params) {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { postId } = await params;
    const body = await request.json();
    const parsed = reviewSchema.parse(body);
    const reviewedPost = await reviewPost({
      postId,
      action: parsed.action,
      note: parsed.note,
      adminUserId: auth.session.userId,
    });

    return apiSuccess(reviewedPost);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "POST_NOT_FOUND") {
      return apiError(
        {
          code: "POST_NOT_FOUND",
          message: "Post not found",
        },
        404
      );
    }

    return apiError(
      {
        code: "ADMIN_REVIEW_POST_FAILED",
        message: "Failed to review post",
        details: message,
      },
      400
    );
  }
}
