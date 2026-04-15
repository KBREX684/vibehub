import type { NextRequest } from "next/server";
import { z } from "zod";
import { authenticateRequest, rateLimitedResponse } from "@/lib/auth";
import { listCommentsForPost, createComment, getPostIdBySlug } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { apiErrorFromRepositoryMessage } from "@/lib/route-repository-message";
import { readJsonObjectBody } from "@/lib/api-json-body";
import { apiErrorFromZod } from "@/lib/zod-api-error";
import { getRequestLogger, serializeError } from "@/lib/logger";

interface Props { params: Promise<{ slug: string }> }

const createCommentBodySchema = z.object({
  body: z.string().trim().min(2, "Comment body too short").max(2000, "Comment body too long (max 2000)"),
  parentCommentId: z.string().min(1).optional(),
});

export async function GET(_request: NextRequest, { params }: Props) {
  const { slug } = await params;
  const postId = await getPostIdBySlug(slug);
  if (!postId) return apiError({ code: "POST_NOT_FOUND", message: "Post not found" }, 404);
  try {
    const { items: comments } = await listCommentsForPost(postId);
    return apiSuccess({ comments });
  } catch (err) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(err);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    const log = getRequestLogger(_request, { route: "GET /api/v1/posts/[slug]/comments" });
    log.error({ err: serializeError(err) }, "comments fetch failed");
    return apiError({ code: "COMMENTS_FETCH_FAILED", message: "Failed to load comments" }, 500);
  }
}

export async function POST(request: NextRequest, { params }: Props) {
  const auth = await authenticateRequest(request);
  if (auth.kind === "rate_limited") return rateLimitedResponse(auth.retryAfterSeconds);
  if (auth.kind !== "ok") return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);

  const { slug } = await params;
  const postId = await getPostIdBySlug(slug);
  if (!postId) return apiError({ code: "POST_NOT_FOUND", message: "Post not found" }, 404);

  const parsed = await readJsonObjectBody(request);
  if (!parsed.ok) return parsed.response;
  const zod = createCommentBodySchema.safeParse(parsed.body);
  if (!zod.success) return apiErrorFromZod(zod.error);
  const { body: commentBody, parentCommentId } = zod.data;

  try {
    const comment = await createComment({ postId, body: commentBody, authorId: auth.user.userId, parentCommentId });
    return apiSuccess({ comment }, 201);
  } catch (err) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(err);
    if (repositoryErrorResponse) return repositoryErrorResponse;
const msg = err instanceof Error ? err.message : String(err);
    const mapped = apiErrorFromRepositoryMessage(msg);
    if (mapped) return mapped;
    const log = getRequestLogger(request, { route: "POST /api/v1/posts/[slug]/comments" });
    log.error({ err: serializeError(err) }, "comment create failed");
    return apiError({ code: "COMMENT_CREATE_FAILED", message: msg }, 500);
  }
}