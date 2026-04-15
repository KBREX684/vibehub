import { Prisma } from "@prisma/client";
import type { CursorPayload } from "@/lib/pagination-cursor";
import type { Post, ReviewStatus } from "@/lib/types";

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  nextCursor?: string;
}

export interface Paginated<T> {
  items: T[];
  pagination: PaginationMeta;
}

export interface ListPostsParams {
  query?: string;
  tag?: string;
  authorId?: string;
  sort?: string;
  featuredOnly?: boolean;
  includeAuthorId?: string;
  page: number;
  limit: number;
  cursor?: string | null;
}

export function toPostDto(post: {
  id: string;
  slug: string;
  authorId: string;
  authorName?: string;
  title: string;
  body: string;
  tags: string[];
  reviewStatus: ReviewStatus;
  moderationNote: string | null;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  featuredAt?: Date | null;
  likeCount?: number;
  bookmarkCount?: number;
  viewerHasLiked?: boolean;
  viewerHasBookmarked?: boolean;
  createdAt: Date;
}): Post {
  return {
    id: post.id,
    slug: post.slug,
    authorId: post.authorId,
    authorName: post.authorName,
    title: post.title,
    body: post.body,
    tags: post.tags,
    reviewStatus: post.reviewStatus,
    moderationNote: post.moderationNote ?? undefined,
    reviewedAt: post.reviewedAt?.toISOString(),
    reviewedBy: post.reviewedBy ?? undefined,
    featuredAt: post.featuredAt?.toISOString(),
    likeCount: post.likeCount ?? 0,
    bookmarkCount: post.bookmarkCount ?? 0,
    viewerHasLiked: post.viewerHasLiked,
    viewerHasBookmarked: post.viewerHasBookmarked,
    createdAt: post.createdAt.toISOString(),
  };
}

export function postCursorWhere(cursor: CursorPayload): Prisma.PostWhereInput {
  const t = new Date(cursor.t);
  return {
    OR: [{ createdAt: { lt: t } }, { AND: [{ createdAt: t }, { id: { lt: cursor.id } }] }],
  };
}
