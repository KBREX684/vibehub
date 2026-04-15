import { Prisma } from "@prisma/client";
import { assertContentSafeText } from "@/lib/content-safety";
import { dispatchWebhookEvent } from "@/lib/webhook-dispatcher";
import { decodeCursor, encodeCursor } from "@/lib/pagination-cursor";
import { postFtsWhereClause } from "@/lib/fts-sql";
import { mapPrismaToRepositoryError, RepositoryError } from "@/lib/repository-errors";
import type { Post } from "@/lib/types";
import type { ListPostsParams, Paginated } from "./shared";
import { postCursorWhere, toPostDto } from "./shared";

async function getPrisma() {
  const db = await import("@/lib/db");
  return db.prisma;
}

export async function listPosts(params: ListPostsParams): Promise<Paginated<Post>> {
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
