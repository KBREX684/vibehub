import { z } from "zod";
import { createPost, listPosts } from "@/lib/repository";
import { parsePagination } from "@/lib/pagination";
import { apiError, apiSuccess } from "@/lib/response";
import { getSessionUserFromCookie } from "@/lib/auth";

const createPostSchema = z.object({
  title: z.string().min(3).max(120),
  body: z.string().min(10),
  tags: z.array(z.string().min(1)).default([]),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { page, limit } = parsePagination(url.searchParams);
    const query = url.searchParams.get("query") ?? undefined;
    const tag = url.searchParams.get("tag") ?? undefined;

    const result = await listPosts({ query, tag, page, limit });
    return apiSuccess(result);
  } catch (error) {
    return apiError(
      {
        code: "POSTS_LIST_FAILED",
        message: "Failed to list discussion posts",
        details: error instanceof Error ? error.message : String(error),
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
    const parsed = createPostSchema.parse(json);
    const post = await createPost({
      ...parsed,
      authorId: sessionUser.userId,
    });

    return apiSuccess(post, 201);
  } catch (error) {
    return apiError(
      {
        code: "POST_CREATE_FAILED",
        message: "Failed to create post",
        details: error instanceof Error ? error.message : String(error),
      },
      400
    );
  }
}
