import { z } from "zod";
import { createPost, listPosts } from "@/lib/repository";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import type { PostSortOrder } from "@/lib/types";
import { parsePagination } from "@/lib/pagination";
import { apiError, apiSuccess } from "@/lib/response";
import { getSessionUserFromCookie } from "@/lib/auth";

const VALID_SORT_ORDERS: readonly PostSortOrder[] = ["recent", "hot", "featured"];

const createPostSchema = z.object({
  title: z.string().min(3).max(120),
  body: z.string().min(10),
  tags: z.array(z.string().min(1)).default([]),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { page, limit } = parsePagination(url.searchParams);
    const cursor = url.searchParams.get("cursor")?.trim() || undefined;
    const mine = url.searchParams.get("mine") === "1" || url.searchParams.get("mine") === "true";
    const sessionUser = await getSessionUserFromCookie();
    const query = url.searchParams.get("query") ?? undefined;
    const tag = url.searchParams.get("tag") ?? undefined;
    const authorId = url.searchParams.get("authorId")?.trim() || undefined;
    const rawSort = url.searchParams.get("sort");
    let sort: PostSortOrder | undefined;
    if (rawSort) {
      if (!VALID_SORT_ORDERS.includes(rawSort as PostSortOrder)) {
        return apiError(
          { code: "INVALID_SORT", message: `sort must be one of: ${VALID_SORT_ORDERS.join(", ")}` },
          400
        );
      }
      sort = rawSort as PostSortOrder;
    }

    const result = await listPosts({
      query,
      tag,
      authorId,
      sort,
      page,
      limit,
      cursor,
      includeAuthorId: mine && sessionUser ? sessionUser.userId : undefined,
    });
    return apiSuccess(result);
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    return apiError(
      {
        code: "POSTS_LIST_FAILED",
        message: "Failed to list discussion posts",
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
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    return apiError(
      {
        code: "POST_CREATE_FAILED",
        message: "Failed to create post",
      },
      400
    );
  }
}
