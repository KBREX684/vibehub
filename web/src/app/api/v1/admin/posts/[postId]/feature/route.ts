import { requireAdminSession } from "@/lib/admin-auth";
import { featurePost, unfeaturePost } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";

interface Params {
  params: Promise<{ postId: string }>;
}

export async function POST(_request: Request, { params }: Params) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  try {
    const { postId } = await params;
    const post = await featurePost({ postId, adminUserId: auth.session.userId });
    return apiSuccess(post);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg === "POST_NOT_FOUND") {
      return apiError({ code: "POST_NOT_FOUND", message: "Post not found" }, 404);
    }
    if (msg === "POST_NOT_APPROVED") {
      return apiError({ code: "POST_NOT_APPROVED", message: "Only approved posts can be featured" }, 400);
    }
    return apiError({ code: "FEATURE_FAILED", message: "Failed to feature post", details: msg }, 500);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  try {
    const { postId } = await params;
    const post = await unfeaturePost({ postId });
    return apiSuccess(post);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg === "POST_NOT_FOUND") {
      return apiError({ code: "POST_NOT_FOUND", message: "Post not found" }, 404);
    }
    return apiError({ code: "UNFEATURE_FAILED", message: "Failed to unfeature post", details: msg }, 500);
  }
}
