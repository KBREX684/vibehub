import { dispatchWebhookEvent } from "@/lib/webhook-dispatcher";
import { paginateArray } from "@/lib/pagination";
import { decodeCursor, encodeCursor } from "@/lib/pagination-cursor";
import { RepositoryError } from "@/lib/repository-errors";
import { assertContentSafeText } from "@/lib/content-safety";
import { mockAuditLogs, mockComments, mockModerationCases, mockPosts, mockUsers } from "@/lib/data/mock-data";
import type { Post } from "@/lib/types";
import type { ListPostsParams, Paginated } from "./shared";
import { toPostDto } from "./shared";

export async function listPostsMock(params: ListPostsParams): Promise<Paginated<Post>> {
  const cursorRaw = params.cursor?.trim();
  const cursorDecoded = cursorRaw ? decodeCursor(cursorRaw) : null;
  if (cursorRaw && !cursorDecoded) {
    throw new RepositoryError("INVALID_INPUT", "Invalid cursor", 400);
  }
  const canUseCursor =
    Boolean(cursorDecoded) &&
    !params.query?.trim() &&
    !params.featuredOnly &&
    (params.sort === undefined || params.sort === "recent");
  const keysetEligible =
    !params.query?.trim() &&
    !params.featuredOnly &&
    (params.sort === undefined || params.sort === "recent");

  if (cursorRaw && !canUseCursor) {
    throw new RepositoryError("INVALID_INPUT", "cursor is not supported with this query/sort combination", 400);
  }

  let filtered = mockPosts.filter((post) => {
    const q = params.query?.toLowerCase().trim();
    const t = params.tag?.toLowerCase().trim();
    const queryMatch =
      !q ||
      post.title.toLowerCase().includes(q) ||
      post.body.toLowerCase().includes(q) ||
      post.tags.some((tag) => tag.toLowerCase().includes(q));
    const tagMatch = !t || post.tags.some((tag) => tag.toLowerCase() === t);
    const visibilityOk =
      post.reviewStatus === "approved" ||
      (params.includeAuthorId ? post.authorId === params.includeAuthorId : false);
    const featuredMatch = !params.featuredOnly || Boolean(post.featuredAt);
    const authorMatch = !params.authorId || post.authorId === params.authorId;
    return queryMatch && tagMatch && visibilityOk && featuredMatch && authorMatch;
  });
  if (params.sort === "featured") {
    filtered = [...filtered].sort((a, b) => {
      if (a.featuredAt && !b.featuredAt) return -1;
      if (!a.featuredAt && b.featuredAt) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  } else if (params.sort === "hot") {
    filtered = [...filtered].sort((a, b) => {
      const ca = mockComments.filter((c) => c.postId === a.id).length;
      const cb = mockComments.filter((c) => c.postId === b.id).length;
      if (cb !== ca) return cb - ca;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  } else {
    filtered = [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  if (canUseCursor && cursorDecoded) {
    const sorted = [...filtered].sort((a, b) => {
      const ca = new Date(a.createdAt).getTime();
      const cb = new Date(b.createdAt).getTime();
      if (cb !== ca) return cb - ca;
      return b.id.localeCompare(a.id);
    });
    const ct = new Date(cursorDecoded.t).getTime();
    const after = sorted.filter((p) => {
      const pt = new Date(p.createdAt).getTime();
      return pt < ct || (pt === ct && p.id < cursorDecoded.id);
    });
    const slice = after.slice(0, params.limit);
    const last = slice[slice.length - 1];
    const hasMore = after.length > params.limit;
    const nextCursor = hasMore && last ? encodeCursor({ t: last.createdAt, id: last.id }) : undefined;
    return {
      items: slice,
      pagination: {
        page: params.page,
        limit: params.limit,
        total: sorted.length,
        totalPages: Math.max(1, Math.ceil(sorted.length / params.limit)),
        nextCursor,
      },
    };
  }

  if (keysetEligible) {
    const sorted = [...filtered].sort((a, b) => {
      const ca = new Date(a.createdAt).getTime();
      const cb = new Date(b.createdAt).getTime();
      if (cb !== ca) return cb - ca;
      return b.id.localeCompare(a.id);
    });
    const off = (params.page - 1) * params.limit;
    const window = sorted.slice(off, off + params.limit + 1);
    const hasMore = window.length > params.limit;
    const slice = hasMore ? window.slice(0, params.limit) : window;
    const last = slice[slice.length - 1];
    const nextCursor = hasMore && last ? encodeCursor({ t: last.createdAt, id: last.id }) : undefined;
    return {
      items: slice,
      pagination: {
        page: params.page,
        limit: params.limit,
        total: sorted.length,
        totalPages: Math.max(1, Math.ceil(sorted.length / params.limit)),
        ...(nextCursor ? { nextCursor } : {}),
      },
    };
  }

  return paginateArray(filtered, params.page, params.limit);
}

export async function getPostBySlugMock(slug: string, options?: { viewerUserId?: string }): Promise<Post | null> {
  const post = mockPosts.find((p) => p.slug === slug);
  if (!post) return null;
  if (post.reviewStatus !== "approved") {
    if (!options?.viewerUserId || post.authorId !== options.viewerUserId) {
      return null;
    }
  }
  return post;
}

export async function createPostMock(input: {
  title: string;
  body: string;
  tags: string[];
  authorId: string;
}): Promise<Post> {
  assertContentSafeText(input.title, "title");
  assertContentSafeText(input.body, "body");
  const slug = input.title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

  const author = mockUsers.find((u) => u.id === input.authorId);
  const post: Post = {
    id: `post_${Date.now()}`,
    slug: `${slug}-${Date.now()}`,
    authorId: input.authorId,
    authorName: author?.name,
    title: input.title,
    body: input.body,
    tags: input.tags,
    reviewStatus: "pending",
    likeCount: 0,
    bookmarkCount: 0,
    createdAt: new Date().toISOString(),
  };
  mockPosts.unshift(post);
  mockModerationCases.unshift({
    id: `mc_${Date.now()}`,
    targetType: "post",
    targetId: post.id,
    status: "pending",
    reason: "new_post_submission",
    createdAt: new Date().toISOString(),
  });
  mockAuditLogs.unshift({
    id: `log_post_${Date.now()}`,
    actorId: input.authorId,
    action: "post_created",
    entityType: "post",
    entityId: post.id,
    metadata: { slug: post.slug, title: post.title },
    createdAt: new Date().toISOString(),
  });
  void dispatchWebhookEvent(input.authorId, "post.created", { postId: post.id, slug: post.slug, title: post.title });
  return post;
}
