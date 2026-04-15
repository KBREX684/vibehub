import { z } from "zod";
import { requireAdminSession } from "@/lib/admin-auth";
import { featurePost, unfeaturePost } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { apiErrorFromRepositoryMessage } from "@/lib/route-repository-message";
import { getRequestLogger, serializeError } from "@/lib/logger";

interface Params {
  params: Promise<{ postId: string }>;
}

export async function POST(request: Request, { params }: Params) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  try {
    const { postId: rawId } = await params;
    const idParse = z.string().min(1).safeParse(rawId);
    if (!idParse.success) {
      return apiError({ code: "INVALID_POST_ID", message: "Invalid post id" }, 400);
    }
    const postId = idParse.data;
    const post = await featurePost({ postId, adminUserId: auth.session.userId });
    return apiSuccess(post);
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    const msg = error instanceof Error ? error.message : String(error);
    const mapped = apiErrorFromRepositoryMessage(msg);
    if (mapped) return mapped;
    const log = getRequestLogger(request, { route: "POST /api/v1/admin/posts/[postId]/feature" });
    log.error({ err: serializeError(error) }, "feature post failed");
    return apiError({ code: "FEATURE_FAILED", message: "Failed to feature post" }, 500);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  try {
    const { postId: rawId } = await params;
    const idParse = z.string().min(1).safeParse(rawId);
    if (!idParse.success) {
      return apiError({ code: "INVALID_POST_ID", message: "Invalid post id" }, 400);
    }
    const postId = idParse.data;
    const post = await unfeaturePost({ postId });
    return apiSuccess(post);
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    const msg = error instanceof Error ? error.message : String(error);
    const mapped = apiErrorFromRepositoryMessage(msg);
    if (mapped) return mapped;
    const log = getRequestLogger(request, { route: "DELETE /api/v1/admin/posts/[postId]/feature" });
    log.error({ err: serializeError(error) }, "unfeature post failed");
    return apiError({ code: "UNFEATURE_FAILED", message: "Failed to unfeature post" }, 500);
  }
}