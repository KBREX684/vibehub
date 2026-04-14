import { Prisma } from "@prisma/client";
import { assertContentSafeText } from "@/lib/content-safety";
import { dispatchWebhookEvent } from "@/lib/webhook-dispatcher";
import { paginateArray } from "@/lib/pagination";
import { decodeCursor, encodeCursor, type CursorPayload } from "@/lib/pagination-cursor";
import { postFtsWhereClause } from "@/lib/fts-sql";
import { mapPrismaToRepositoryError, RepositoryError } from "@/lib/repository-errors";
import { isMockDataEnabled } from "@/lib/runtime-mode";
import { mockAuditLogs, mockComments, mockModerationCases, mockPosts, mockUsers } from "@/lib/data/mock-data";
import type { Post, ReviewStatus } from "@/lib/types";

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  nextCursor?: string;
}

interface Paginated<T> {
  items: T[];
  pagination: PaginationMeta;
}

const useMockData = isMockDataEnabled();

async function getPrisma() {
  const db = await import("@/lib/db");
  return db.prisma;
}

function toPostDto(post: {
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

function postCursorWhere(cursor: CursorPayload): Prisma.PostWhereInput {
  const t = new Date(cursor.t);
  return {
    OR: [{ createdAt: { lt: t } }, { AND: [{ createdAt: t }, { id: { lt: cursor.id } }] }],
  };
}

export async function listPosts(params: {
  query?: string;
  tag?: string;
  authorId?: string;
  sort?: string;
  featuredOnly?: boolean;
  includeAuthorId?: string;
  page: number;
  limit: number;
  cursor?: string | null;
}): Promise<Paginated<Post>> {
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

  if (useMockData) {
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

  const prisma = await getPrisma();
  const offset = (params.page - 1) * params.limit;
  const take = params.limit;
  const q = params.query?.trim();

  if (q) {
    const baseWhere = postFtsWhereClause(q, {
      tag: params.tag?.trim(),
      includeAuthorId: params.includeAuthorId,
      authorId: params.authorId,
    });
    const whereSql = params.featuredOnly
      ? Prisma.join([baseWhere, Prisma.sql`p."featuredAt" IS NOT NULL`], " AND ")
      : baseWhere;

    const [countRow] = await prisma.$queryRaw<[{ count: bigint }]>(
      Prisma.sql`SELECT COUNT(*)::bigint AS count FROM "Post" p WHERE ${whereSql}`
    );
    const total = Number(countRow?.count ?? 0n);

    const idRows = await prisma.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`
        SELECT p.id
        FROM "Post" p
        WHERE ${whereSql}
        ORDER BY ts_rank_cd(p."searchVector", plainto_tsquery('english', ${q})) DESC, p."createdAt" DESC
        OFFSET ${offset} LIMIT ${take}
      `
    );
    const ids = idRows.map((r) => r.id);
    if (ids.length === 0) {
      return {
        items: [],
        pagination: { page: params.page, limit: params.limit, total: 0, totalPages: 1 },
      };
    }
    const posts = await prisma.post.findMany({
      where: { id: { in: ids } },
      include: {
        author: { select: { name: true } },
        _count: { select: { likes: true, bookmarks: true } },
      },
    });
    const byId = new Map(posts.map((p) => [p.id, p]));
    let ordered = ids.map((id) => byId.get(id)).filter(Boolean) as typeof posts;
    if (params.sort === "hot") {
      ordered = [...ordered].sort((a, b) => b._count.likes - a._count.likes);
    }
    return {
      items: ordered.map((p) =>
        toPostDto({ ...p, authorName: p.author.name, likeCount: p._count.likes, bookmarkCount: p._count.bookmarks })
      ),
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / params.limit)),
      },
    };
  }

  const reviewFilter = params.includeAuthorId
    ? {
        OR: [
          { reviewStatus: "approved" as const },
          { authorId: params.includeAuthorId, reviewStatus: { not: "approved" as const } },
        ],
      }
    : { reviewStatus: "approved" as const };

  const where = {
    AND: [
      reviewFilter,
      params.authorId ? { authorId: params.authorId } : {},
      params.tag
        ? {
            tags: {
              has: params.tag,
            },
          }
        : {},
      params.featuredOnly ? { featuredAt: { not: null } } : {},
      ...(canUseCursor && cursorDecoded ? [postCursorWhere(cursorDecoded)] : []),
    ],
  };

  const orderBy: Prisma.PostOrderByWithRelationInput | Prisma.PostOrderByWithRelationInput[] =
    params.sort === "featured"
      ? [{ featuredAt: "desc" }, { createdAt: "desc" }]
      : params.sort === "hot"
        ? [{ likes: { _count: "desc" } }, { createdAt: "desc" }]
        : { createdAt: "desc" };

  const skip = canUseCursor && cursorDecoded ? 0 : offset;
  const takePlusOne =
    (canUseCursor && cursorDecoded) || (!q && keysetEligible) ? take + 1 : take;

  const [items, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy,
      skip,
      take: takePlusOne,
      include: {
        author: { select: { name: true } },
        _count: { select: { likes: true, bookmarks: true } },
      },
    }),
    prisma.post.count({ where }),
  ]);

  let orderedItems = items;
  if (q && params.sort === "hot") {
    orderedItems = [...items].sort((a, b) => b._count.likes - a._count.likes);
  }

  const hasMorePage =
    ((!q && keysetEligible) || (canUseCursor && cursorDecoded)) && orderedItems.length > take;
  const pageItems = hasMorePage ? orderedItems.slice(0, take) : orderedItems;
  const last = pageItems[pageItems.length - 1];
  const nextCursor =
    !q && keysetEligible && last && hasMorePage
      ? encodeCursor({ t: last.createdAt.toISOString(), id: last.id })
      : undefined;

  return {
    items: pageItems.map((p) =>
      toPostDto({ ...p, authorName: p.author.name, likeCount: p._count.likes, bookmarkCount: p._count.bookmarks })
    ),
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / params.limit)),
      ...(nextCursor ? { nextCursor } : {}),
    },
  };
}

export async function getPostBySlug(slug: string, options?: { viewerUserId?: string }): Promise<Post | null> {
  if (useMockData) {
    const post = mockPosts.find((p) => p.slug === slug);
    if (!post) return null;
    if (post.reviewStatus !== "approved") {
      if (!options?.viewerUserId || post.authorId !== options.viewerUserId) {
        return null;
      }
    }
    return post;
  }
  const prisma = await getPrisma();
  const p = await prisma.post.findUnique({
    where: { slug },
    include: {
      author: { select: { name: true } },
      _count: { select: { likes: true, bookmarks: true } },
    },
  });
  if (!p) return null;
  if (p.reviewStatus !== "approved") {
    if (!options?.viewerUserId || p.authorId !== options.viewerUserId) {
      return null;
    }
  }
  return toPostDto({ ...p, authorName: p.author.name, likeCount: p._count.likes, bookmarkCount: p._count.bookmarks });
}

export async function createPost(input: {
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

  if (useMockData) {
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

  const prisma = await getPrisma();
  try {
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const post = await tx.post.create({
        data: {
          slug: `${slug}-${Date.now()}`,
          title: input.title,
          body: input.body,
          tags: input.tags,
          authorId: input.authorId,
          reviewStatus: "pending",
        },
      });

      await tx.moderationCase.create({
        data: {
          targetType: "post",
          targetId: post.id,
          postId: post.id,
          status: "pending",
          reason: "new_post_submission",
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: input.authorId,
          action: "post_created",
          entityType: "post",
          entityId: post.id,
          metadata: { slug: post.slug, title: post.title },
        },
      });

      return post;
    });

    void dispatchWebhookEvent(result.authorId, "post.created", {
      postId: result.id,
      slug: result.slug,
      title: result.title,
    });
    return toPostDto(result);
  } catch (e) {
    const mapped = mapPrismaToRepositoryError(e);
    if (mapped) throw mapped;
    throw e;
  }
}
