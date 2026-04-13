import type { NextRequest } from "next/server";
import { authenticateRequest, rateLimitedResponse } from "@/lib/auth";
import { listCommentsForPost, createComment, getPostIdBySlug } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";

interface Props { params: Promise<{ slug: string }> }

export async function GET(_request: NextRequest, { params }: Props) {
  const { slug } = await params;
  const postId = await getPostIdBySlug(slug);
  if (!postId) return apiError({ code: "POST_NOT_FOUND", message: "Post not found" }, 404);
  try {
    const { items: comments } = await listCommentsForPost(postId);
    return apiSuccess({ comments });
  } catch (err) {
    return apiError({ code: "COMMENTS_FETCH_FAILED", message: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
}

export async function POST(request: NextRequest, { params }: Props) {
  const auth = await authenticateRequest(request);
  if (auth.kind === "rate_limited") return rateLimitedResponse(auth.retryAfterSeconds);
  if (auth.kind !== "ok") return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);

  const { slug } = await params;
  const postId = await getPostIdBySlug(slug);
  if (!postId) return apiError({ code: "POST_NOT_FOUND", message: "Post not found" }, 404);

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return apiError({ code: "INVALID_JSON", message: "Invalid JSON" }, 400); }

  const commentBody = typeof body.body === "string" ? body.body.trim() : "";
  const parentCommentId = typeof body.parentCommentId === "string" ? body.parentCommentId : undefined;

  if (!commentBody || commentBody.length < 2) return apiError({ code: "INVALID_BODY", message: "Comment body too short" }, 400);
  if (commentBody.length > 2000) return apiError({ code: "INVALID_BODY", message: "Comment body too long (max 2000)" }, 400);

  try {
    const comment = await createComment({ postId, body: commentBody, authorId: auth.user.userId, parentCommentId });
    return apiSuccess({ comment }, 201);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "PARENT_COMMENT_NOT_FOUND") return apiError({ code: "PARENT_COMMENT_NOT_FOUND", message: "Parent comment not found" }, 404);
    if (msg === "MAX_NESTING_DEPTH_EXCEEDED") return apiError({ code: "MAX_NESTING_DEPTH_EXCEEDED", message: "Maximum reply nesting depth (2) exceeded" }, 400);
    return apiError({ code: "COMMENT_CREATE_FAILED", message: msg }, 500);
  }
}
