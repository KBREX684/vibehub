import type { NextRequest } from "next/server";
import { authenticateRequest, rateLimitedResponse, resolveReadAuth } from "@/lib/auth";
import { getPostBySlug, listCommentsForPost } from "@/lib/repository";
import { parsePagination } from "@/lib/pagination";
import { apiError, apiSuccess } from "@/lib/response";

interface Params {
  params: Promise<{ slug: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await authenticateRequest(request, "read:posts:detail");
  const gate = resolveReadAuth(auth, true);
  if (!gate.ok) {
    if (gate.status === 429) {
      return rateLimitedResponse(gate.retryAfterSeconds ?? 60);
    }
    return apiError({ code: "UNAUTHORIZED", message: "Login or API key required" }, 401);
  }

  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) {
    return apiError({ code: "POST_NOT_FOUND", message: `Post "${slug}" not found` }, 404);
  }

  const url = new URL(request.url);
  const { page, limit } = parsePagination(url.searchParams);
  const comments = await listCommentsForPost({ postId: post.id, page, limit });

  return apiSuccess({ post, comments });
}
