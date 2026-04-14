import { Prisma } from "@prisma/client";
import type { ProjectStatus } from "@/lib/types";

/** PostgreSQL `plainto_tsquery` + `tsvector` match for Project (P2-1). */
export function projectFtsWhereClause(
  q: string,
  opts: {
    tag?: string;
    tech?: string;
    status?: ProjectStatus;
    teamSlug?: string;
    creatorId?: string;
  }
): Prisma.Sql {
  const parts: Prisma.Sql[] = [
    Prisma.sql`p."searchVector" @@ plainto_tsquery('english', ${q})`,
  ];
  if (opts.tag) parts.push(Prisma.sql`${opts.tag} = ANY(p.tags)`);
  if (opts.tech) parts.push(Prisma.sql`${opts.tech} = ANY(p."techStack")`);
  if (opts.status) parts.push(Prisma.sql`p.status = CAST(${opts.status} AS "ProjectStatus")`);
  if (opts.teamSlug) {
    parts.push(
      Prisma.sql`EXISTS (SELECT 1 FROM "Team" te WHERE te.id = p."teamId" AND te.slug = ${opts.teamSlug})`
    );
  }
  if (opts.creatorId) parts.push(Prisma.sql`p."creatorId" = ${opts.creatorId}`);
  return Prisma.join(parts, " AND ");
}

export function postReviewVisibilitySql(includeAuthorId?: string): Prisma.Sql {
  if (!includeAuthorId) {
    return Prisma.sql`p."reviewStatus" = 'approved'`;
  }
  return Prisma.sql`(p."reviewStatus" = 'approved' OR (p."authorId" = ${includeAuthorId} AND p."reviewStatus" <> 'approved'))`;
}

export function postFtsWhereClause(
  q: string,
  opts: { tag?: string; includeAuthorId?: string; authorId?: string }
): Prisma.Sql {
  const parts: Prisma.Sql[] = [
    postReviewVisibilitySql(opts.includeAuthorId),
    Prisma.sql`p."searchVector" @@ plainto_tsquery('english', ${q})`,
  ];
  if (opts.tag) parts.push(Prisma.sql`${opts.tag} = ANY(p.tags)`);
  if (opts.authorId) parts.push(Prisma.sql`p."authorId" = ${opts.authorId}`);
  return Prisma.join(parts, " AND ");
}

export function creatorFtsWhereClause(q: string): Prisma.Sql {
  return Prisma.sql`cp."searchVector" @@ plainto_tsquery('english', ${q})`;
}
