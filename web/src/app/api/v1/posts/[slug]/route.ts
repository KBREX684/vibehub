import type { NextRequest } from "next/server";
import { z } from "zod";
import { authenticateRequest, rateLimitedResponse, resolveReadAuth } from "@/lib/auth";
import { getPostBySlug, listCommentsForPost, updatePost, deletePost } from "@/lib/repository";
import { parsePagination } from "@/lib/pagination";
import { apiError, apiSuccess } from "@/lib/response";

interface Params {
  params: Promise<{ slug: string }>;
}

const patchSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  body:  z.string().min(10).max(50_000).optional(),
  tags:  z.array(z.string().min(1).max(32)).max(10).optional(),
});

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await authenticateRequest(request, "read:posts:detail");
  const gate = resolveReadAuth(auth, true);
  if (!gate.ok) {
    if (gate.status === 429) return rateLimitedResponse(gate.retryAfterSeconds ?? 60);
    return apiError({ code: "UNAUTHORIZED", message: "Login or API key required" }, 401);
  }

  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return apiError({ code: "POST_NOT_FOUND", message: `Post "${slug}" not found` }, 404);

  const url = new URL(request.url);
  const { page, limit } = parsePagination(url.searchParams);
  const comments = await listCommentsForPost({ postId: post.id, page, limit });
  return apiSuccess({ post, comments });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await authenticateRequest(request);
  if (auth.kind === "rate_limited") return rateLimitedResponse(auth.retryAfterSeconds);
  if (auth.kind !== "ok") return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);

  const { slug } = await params;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return apiError({ code: "INVALID_JSON", message: "Invalid JSON" }, 400); }

  try {
    const parsed = patchSchema.parse(body);
    const post = await updatePost({ slug, actorUserId: auth.user.userId, actorRole: auth.user.role, ...parsed });
    return apiSuccess({ post });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "POST_NOT_FOUND")      return apiError({ code: "POST_NOT_FOUND", message: "Post not found" }, 404);
    if (msg === "FORBIDDEN_NOT_AUTHOR") return apiError({ code: "FORBIDDEN", message: "Only author or admin can edit" }, 403);
    if (err instanceof z.ZodError)     return apiError({ code: "INVALID_BODY", message: "Validation failed", details: err.flatten() }, 400);
    return apiError({ code: "POST_UPDATE_FAILED", message: msg }, 500);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const auth = await authenticateRequest(_request);
  if (auth.kind === "rate_limited") return rateLimitedResponse(auth.retryAfterSeconds);
  if (auth.kind !== "ok") return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);

  const { slug } = await params;
  try {
    await deletePost({ slug, actorUserId: auth.user.userId, actorRole: auth.user.role });
    return apiSuccess({ deleted: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "POST_NOT_FOUND")      return apiError({ code: "POST_NOT_FOUND", message: "Post not found" }, 404);
    if (msg === "FORBIDDEN_NOT_AUTHOR") return apiError({ code: "FORBIDDEN", message: "Only author or admin can delete" }, 403);
    return apiError({ code: "POST_DELETE_FAILED", message: msg }, 500);
  }
}
