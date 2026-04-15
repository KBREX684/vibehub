import { Prisma } from "@prisma/client";
import { paginateArray } from "@/lib/pagination";
import { decodeCursor, encodeCursor, type CursorPayload } from "@/lib/pagination-cursor";
import { projectFtsWhereClause } from "@/lib/fts-sql";
import { RepositoryError, mapPrismaToRepositoryError } from "@/lib/repository-errors";
import { dispatchWebhookEvent } from "@/lib/webhook-dispatcher";
import { incrementContributionCreditField, contributionWeights } from "@/lib/contribution-credit-increment";
import { isMockDataEnabled } from "@/lib/runtime-mode";
import { mockCreators, mockProjects, mockTeams, mockTeamMemberships, mockAuditLogs } from "@/lib/data/mock-data";
import type { Project } from "@/lib/types";

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

function toProjectDto(project: {
  id: string;
  slug: string;
  creatorId: string;
  teamId: string | null;
  title: string;
  oneLiner: string;
  description: string;
  techStack: string[];
  tags: string[];
  status: Project["status"];
  demoUrl: string | null;
  repoUrl?: string | null;
  websiteUrl?: string | null;
  screenshots?: string[];
  logoUrl?: string | null;
  openSource?: boolean;
  license?: string | null;
  updatedAt: Date;
  featuredAt?: Date | null;
  featuredRank?: number | null;
  team?: { slug: string; name: string } | null;
}): Project {
  const base: Project = {
    id: project.id,
    slug: project.slug,
    creatorId: project.creatorId,
    title: project.title,
    oneLiner: project.oneLiner,
    description: project.description,
    techStack: project.techStack,
    tags: project.tags,
    status: project.status,
    demoUrl: project.demoUrl ?? undefined,
    repoUrl: project.repoUrl ?? undefined,
    websiteUrl: project.websiteUrl ?? undefined,
    screenshots: project.screenshots ?? [],
    logoUrl: project.logoUrl ?? undefined,
    openSource: project.openSource ?? false,
    license: project.license ?? undefined,
    updatedAt: project.updatedAt.toISOString(),
  };
  if (project.featuredAt) base.featuredAt = project.featuredAt.toISOString();
  if (project.featuredRank != null) base.featuredRank = project.featuredRank;
  if (project.teamId) base.teamId = project.teamId;
  if (project.team) base.team = { slug: project.team.slug, name: project.team.name };
  return base;
}

function projectCursorWhere(cursor: CursorPayload): Prisma.ProjectWhereInput {
  const t = new Date(cursor.t);
  return {
    OR: [{ updatedAt: { lt: t } }, { AND: [{ updatedAt: t }, { id: { lt: cursor.id } }] }],
  };
}

export async function listProjects(params: {
  query?: string;
  tag?: string;
  tech?: string;
  status?: Project["status"];
  team?: string;
  creatorId?: string;
  page: number;
  limit: number;
  cursor?: string | null;
}): Promise<Paginated<Project>> {
  const techFilter = params.tech?.trim();
  const statusFilter = params.status;
  const teamSlug = params.team?.trim();
  const cursorRaw = params.cursor?.trim();
  const cursorDecoded = cursorRaw ? decodeCursor(cursorRaw) : null;
  if (cursorRaw && !cursorDecoded) throw new RepositoryError("INVALID_INPUT", "Invalid cursor", 400);

  const canUseCursor = Boolean(cursorDecoded) && !params.query?.trim();
  const keysetEligible = !params.query?.trim();
  if (cursorRaw && !canUseCursor) {
    throw new RepositoryError("INVALID_INPUT", "cursor is not supported when query is set", 400);
  }

  if (useMockData) {
    const teamIdFilter = teamSlug ? mockTeams.find((x) => x.slug === teamSlug)?.id : undefined;
    if (teamSlug && !teamIdFilter) {
      return {
        items: [],
        pagination: { page: params.page, limit: params.limit, total: 0, totalPages: 1 },
      };
    }
    const filtered = mockProjects.filter((project) => {
      const q = params.query?.toLowerCase().trim();
      const t = params.tag?.toLowerCase().trim();
      const queryMatch =
        !q ||
        project.title.toLowerCase().includes(q) ||
        project.description.toLowerCase().includes(q) ||
        project.tags.some((tag) => tag.toLowerCase().includes(q));
      const tagMatch = !t || project.tags.some((tag) => tag.toLowerCase() === t);
      const techMatch = !techFilter || project.techStack.some((item) => item.toLowerCase() === techFilter.toLowerCase());
      const statusMatch = !statusFilter || project.status === statusFilter;
      const teamMatch = !teamIdFilter || project.teamId === teamIdFilter;
      const creatorMatch = !params.creatorId || project.creatorId === params.creatorId;
      return queryMatch && tagMatch && techMatch && statusMatch && teamMatch && creatorMatch;
    });

    const sorted = [...filtered].sort((a, b) => {
      const ua = new Date(a.updatedAt).getTime();
      const ub = new Date(b.updatedAt).getTime();
      if (ub !== ua) return ub - ua;
      return b.id.localeCompare(a.id);
    });

    if (canUseCursor && cursorDecoded) {
      const ct = new Date(cursorDecoded.t).getTime();
      const after = sorted.filter((p) => {
        const ut = new Date(p.updatedAt).getTime();
        return ut < ct || (ut === ct && p.id < cursorDecoded.id);
      });
      const slice = after.slice(0, params.limit);
      const last = slice[slice.length - 1];
      const hasMore = after.length > params.limit;
      const nextCursor = hasMore && last ? encodeCursor({ t: last.updatedAt, id: last.id }) : undefined;
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

    if (keysetEligible) {
      const off = (params.page - 1) * params.limit;
      const window = sorted.slice(off, off + params.limit + 1);
      const hasMore = window.length > params.limit;
      const slice = hasMore ? window.slice(0, params.limit) : window;
      const last = slice[slice.length - 1];
      const nextCursor = hasMore && last ? encodeCursor({ t: last.updatedAt, id: last.id }) : undefined;
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
  const q = params.query?.trim();
  const offset = (params.page - 1) * params.limit;
  const take = params.limit;

  if (q) {
    const whereSql = projectFtsWhereClause(q, {
      tag: params.tag?.trim(),
      tech: techFilter,
      status: statusFilter,
      teamSlug,
      creatorId: params.creatorId,
    });
    const [countRow] = await prisma.$queryRaw<[{ count: bigint }]>(
      Prisma.sql`SELECT COUNT(*)::bigint AS count FROM "Project" p WHERE ${whereSql}`
    );
    const total = Number(countRow?.count ?? 0n);
    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        slug: string;
        creatorId: string;
        teamId: string | null;
        title: string;
        oneLiner: string;
        description: string;
        techStack: string[];
        tags: string[];
        status: Project["status"];
        demoUrl: string | null;
        repoUrl: string | null;
        websiteUrl: string | null;
        screenshots: string[];
        logoUrl: string | null;
        openSource: boolean;
        license: string | null;
        updatedAt: Date;
        team_slug: string | null;
        team_name: string | null;
      }>
    >(Prisma.sql`
      SELECT p.id, p.slug, p."creatorId", p."teamId", p.title, p."oneLiner", p.description,
        p."techStack", p.tags, p.status, p."demoUrl", p."repoUrl", p."websiteUrl", p.screenshots,
        p."logoUrl", p."openSource", p.license, p."updatedAt",
        te.slug AS team_slug, te.name AS team_name
      FROM "Project" p
      LEFT JOIN "Team" te ON te.id = p."teamId"
      WHERE ${whereSql}
      ORDER BY ts_rank_cd(p."searchVector", plainto_tsquery('english', ${q})) DESC, p."updatedAt" DESC
      OFFSET ${offset} LIMIT ${take}
    `);
    return {
      items: rows.map((r) =>
        toProjectDto({
          id: r.id,
          slug: r.slug,
          creatorId: r.creatorId,
          teamId: r.teamId,
          title: r.title,
          oneLiner: r.oneLiner,
          description: r.description,
          techStack: r.techStack,
          tags: r.tags,
          status: r.status,
          demoUrl: r.demoUrl,
          repoUrl: r.repoUrl,
          websiteUrl: r.websiteUrl,
          screenshots: r.screenshots,
          logoUrl: r.logoUrl,
          openSource: r.openSource,
          license: r.license,
          updatedAt: r.updatedAt,
          team: r.team_slug && r.team_name ? { slug: r.team_slug, name: r.team_name } : null,
        })
      ),
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / params.limit)),
      },
    };
  }

  const andParts: Prisma.ProjectWhereInput[] = [];
  if (params.tag) andParts.push({ tags: { has: params.tag } });
  if (techFilter) andParts.push({ techStack: { has: techFilter } });
  if (statusFilter) andParts.push({ status: statusFilter });
  if (teamSlug) andParts.push({ team: { slug: teamSlug } });
  if (params.creatorId) andParts.push({ creatorId: params.creatorId });
  if (canUseCursor && cursorDecoded) andParts.push(projectCursorWhere(cursorDecoded));
  const where: Prisma.ProjectWhereInput = andParts.length ? { AND: andParts } : {};

  const skip = canUseCursor && cursorDecoded ? 0 : offset;
  const takePlusOne = (canUseCursor && cursorDecoded) || (!q && keysetEligible) ? take + 1 : take;
  const [items, total] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take: takePlusOne,
      include: { team: { select: { slug: true, name: true } } },
    }),
    prisma.project.count({ where }),
  ]);
  const hasMorePage = ((!q && keysetEligible) || (canUseCursor && cursorDecoded)) && items.length > take;
  const pageItems = hasMorePage ? items.slice(0, take) : items;
  const last = pageItems[pageItems.length - 1];
  const nextCursor =
    !q && keysetEligible && last && hasMorePage
      ? encodeCursor({ t: last.updatedAt.toISOString(), id: last.id })
      : undefined;
  return {
    items: pageItems.map((p) => toProjectDto({ ...p, teamId: p.teamId, team: p.team })),
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / params.limit)),
      ...(nextCursor ? { nextCursor } : {}),
    },
  };
}

export async function getProjectFilterFacets(): Promise<{ tags: string[]; techStack: string[] }> {
  if (useMockData) {
    const tagSet = new Set<string>();
    const techSet = new Set<string>();
    for (const project of mockProjects) {
      project.tags.forEach((t) => tagSet.add(t));
      project.techStack.forEach((t) => techSet.add(t));
    }
    return {
      tags: [...tagSet].sort((a, b) => a.localeCompare(b)),
      techStack: [...techSet].sort((a, b) => a.localeCompare(b)),
    };
  }

  const prisma = await getPrisma();
  const rows = await prisma.project.findMany({
    select: { tags: true, techStack: true },
  });
  const tagSet = new Set<string>();
  const techSet = new Set<string>();
  for (const row of rows) {
    row.tags.forEach((t) => tagSet.add(t));
    row.techStack.forEach((t) => techSet.add(t));
  }
  return {
    tags: [...tagSet].sort((a, b) => a.localeCompare(b)),
    techStack: [...techSet].sort((a, b) => a.localeCompare(b)),
  };
}

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  if (useMockData) return mockProjects.find((project) => project.slug === slug) ?? null;
  const prisma = await getPrisma();
  const project = await prisma.project.findUnique({
    where: { slug },
    include: { team: { select: { slug: true, name: true } } },
  });
  return project ? toProjectDto({ ...project, team: project.team }) : null;
}

export async function createProject(input: {
  title: string;
  oneLiner: string;
  description: string;
  techStack: string[];
  tags: string[];
  status: Project["status"];
  demoUrl?: string;
  creatorUserId: string;
}): Promise<Project> {
  const slug = input.title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

  if (useMockData) {
    const creator = mockCreators.find((c) => c.userId === input.creatorUserId);
    if (!creator) {
      throw new RepositoryError(
        "CREATOR_PROFILE_REQUIRED",
        "A creator profile is required to submit projects",
        403
      );
    }
    const project: Project = {
      id: `proj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      slug: `${slug}-${Date.now()}`,
      creatorId: creator.id,
      title: input.title,
      oneLiner: input.oneLiner,
      description: input.description,
      techStack: input.techStack,
      tags: input.tags,
      status: input.status,
      demoUrl: input.demoUrl,
      screenshots: [],
      openSource: false,
      updatedAt: new Date().toISOString(),
    };
    mockProjects.unshift(project);
    mockAuditLogs.unshift({
      id: `log_proj_${Date.now()}`,
      actorId: input.creatorUserId,
      action: "project_created",
      entityType: "project",
      entityId: project.id,
      metadata: { slug: project.slug, title: project.title },
      createdAt: new Date().toISOString(),
    });
    void incrementContributionCreditField({
      userId: input.creatorUserId,
      useMockData: true,
      deltaScore: contributionWeights.projectCreated,
      field: "projectsCreated",
    });
    void dispatchWebhookEvent(input.creatorUserId, "project.created", {
      projectId: project.id,
      slug: project.slug,
      title: project.title,
    });
    return project;
  }

  const prisma = await getPrisma();
  const creator = await prisma.creatorProfile.findUnique({ where: { userId: input.creatorUserId } });
  if (!creator) {
    throw new RepositoryError(
      "CREATOR_PROFILE_REQUIRED",
      "A creator profile is required to submit projects",
      403
    );
  }
  try {
    const project = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const p = await tx.project.create({
        data: {
          slug: `${slug}-${Date.now()}`,
          creatorId: creator.id,
          title: input.title,
          oneLiner: input.oneLiner,
          description: input.description,
          techStack: input.techStack,
          tags: input.tags,
          status: input.status,
          demoUrl: input.demoUrl ?? null,
        },
        include: { team: { select: { slug: true, name: true } } },
      });
      await tx.auditLog.create({
        data: {
          actorId: input.creatorUserId,
          action: "project_created",
          entityType: "project",
          entityId: p.id,
          metadata: { slug: p.slug, title: p.title },
        },
      });
      return p;
    });
    void incrementContributionCreditField({
      userId: input.creatorUserId,
      useMockData: false,
      deltaScore: contributionWeights.projectCreated,
      field: "projectsCreated",
    });
    void dispatchWebhookEvent(input.creatorUserId, "project.created", {
      projectId: project.id,
      slug: project.slug,
      title: project.title,
    });
    return toProjectDto({ ...project, team: project.team });
  } catch (e) {
    const mapped = mapPrismaToRepositoryError(e);
    if (mapped) throw mapped;
    throw e;
  }
}

export async function updateProject(params: {
  projectSlug: string;
  actorUserId: string;
  title?: string;
  oneLiner?: string;
  description?: string;
  techStack?: string[];
  tags?: string[];
  status?: Project["status"];
  demoUrl?: string | null;
}): Promise<Project> {
  if (useMockData) {
    const project = mockProjects.find((p) => p.slug === params.projectSlug);
    if (!project) throw new Error("PROJECT_NOT_FOUND");
    const creator = mockCreators.find((c) => c.id === project.creatorId);
    if (!creator || creator.userId !== params.actorUserId) throw new Error("FORBIDDEN_NOT_CREATOR");
    if (params.title !== undefined) project.title = params.title;
    if (params.oneLiner !== undefined) project.oneLiner = params.oneLiner;
    if (params.description !== undefined) project.description = params.description;
    if (params.techStack !== undefined) project.techStack = params.techStack;
    if (params.tags !== undefined) project.tags = params.tags;
    if (params.status !== undefined) project.status = params.status;
    if (params.demoUrl !== undefined) project.demoUrl = params.demoUrl ?? undefined;
    project.updatedAt = new Date().toISOString();
    return { ...project };
  }

  const prisma = await getPrisma();
  const project = await prisma.project.findUnique({
    where: { slug: params.projectSlug },
    include: { creator: { select: { userId: true } } },
  });
  if (!project) throw new Error("PROJECT_NOT_FOUND");
  if (project.creator.userId !== params.actorUserId) throw new Error("FORBIDDEN_NOT_CREATOR");

  const data: Record<string, unknown> = {};
  if (params.title !== undefined) data.title = params.title;
  if (params.oneLiner !== undefined) data.oneLiner = params.oneLiner;
  if (params.description !== undefined) data.description = params.description;
  if (params.techStack !== undefined) data.techStack = params.techStack;
  if (params.tags !== undefined) data.tags = params.tags;
  if (params.status !== undefined) data.status = params.status;
  if (params.demoUrl !== undefined) data.demoUrl = params.demoUrl;

  const updated = await prisma.project.update({
    where: { slug: params.projectSlug },
    data,
    include: { team: { select: { slug: true, name: true } } },
  });
  return toProjectDto({ ...updated, team: updated.team });
}

export async function deleteProject(params: {
  projectSlug: string;
  actorUserId: string;
  actorRole: "admin" | "user" | "guest";
}): Promise<void> {
  if (useMockData) {
    const idx = mockProjects.findIndex((p) => p.slug === params.projectSlug);
    if (idx === -1) throw new Error("PROJECT_NOT_FOUND");
    const project = mockProjects[idx];
    const creator = mockCreators.find((c) => c.id === project.creatorId);
    if ((!creator || creator.userId !== params.actorUserId) && params.actorRole !== "admin") {
      throw new Error("FORBIDDEN_NOT_CREATOR");
    }
    const pid = mockProjects[idx].id;
    mockProjects.splice(idx, 1);
    mockAuditLogs.unshift({
      id: `log_proj_del_${Date.now()}`,
      actorId: params.actorUserId,
      action: "project_deleted",
      entityType: "project",
      entityId: pid,
      metadata: { slug: params.projectSlug },
      createdAt: new Date().toISOString(),
    });
    return;
  }

  const prisma = await getPrisma();
  const project = await prisma.project.findUnique({
    where: { slug: params.projectSlug },
    include: { creator: { select: { userId: true } } },
  });
  if (!project) throw new Error("PROJECT_NOT_FOUND");
  if (project.creator.userId !== params.actorUserId && params.actorRole !== "admin") {
    throw new Error("FORBIDDEN_NOT_CREATOR");
  }
  await prisma.$transaction([
    prisma.project.delete({ where: { slug: params.projectSlug } }),
    prisma.auditLog.create({
      data: {
        actorId: params.actorUserId,
        action: "project_deleted",
        entityType: "project",
        entityId: project.id,
        metadata: { slug: params.projectSlug },
      },
    }),
  ]);
}

export async function updateProjectTeamLink(params: {
  projectSlug: string;
  actorUserId: string;
  teamSlug: string | null;
}): Promise<Project> {
  if (useMockData) {
    const project = mockProjects.find((p) => p.slug === params.projectSlug);
    if (!project) throw new Error("PROJECT_NOT_FOUND");
    const creator = mockCreators.find((c) => c.id === project.creatorId);
    if (!creator || creator.userId !== params.actorUserId) throw new Error("FORBIDDEN_NOT_CREATOR");
    if (params.teamSlug === null || params.teamSlug === "") {
      project.teamId = undefined;
      project.team = undefined;
      return { ...project };
    }
    const slugTrim = params.teamSlug.trim();
    const team = mockTeams.find((t) => t.slug === slugTrim);
    if (!team) throw new Error("TEAM_NOT_FOUND");
    const isMember = mockTeamMemberships.some((m) => m.teamId === team.id && m.userId === params.actorUserId);
    if (!isMember) throw new Error("FORBIDDEN_NOT_TEAM_MEMBER");
    project.teamId = team.id;
    project.team = { slug: team.slug, name: team.name };
    return { ...project };
  }

  const prisma = await getPrisma();
  const project = await prisma.project.findUnique({
    where: { slug: params.projectSlug },
    include: { creator: { select: { userId: true } } },
  });
  if (!project) throw new Error("PROJECT_NOT_FOUND");
  if (project.creator.userId !== params.actorUserId) throw new Error("FORBIDDEN_NOT_CREATOR");

  if (params.teamSlug === null || params.teamSlug === "") {
    const updated = await prisma.project.update({
      where: { id: project.id },
      data: { teamId: null },
      include: { team: { select: { slug: true, name: true } } },
    });
    return toProjectDto({ ...updated, team: updated.team });
  }

  const slugTrim = params.teamSlug.trim();
  const team = await prisma.team.findUnique({ where: { slug: slugTrim }, select: { id: true } });
  if (!team) throw new Error("TEAM_NOT_FOUND");

  const membership = await prisma.teamMembership.findUnique({
    where: { teamId_userId: { teamId: team.id, userId: params.actorUserId } },
  });
  if (!membership) throw new Error("FORBIDDEN_NOT_TEAM_MEMBER");

  const updated = await prisma.project.update({
    where: { id: project.id },
    data: { teamId: team.id },
    include: { team: { select: { slug: true, name: true } } },
  });
  return toProjectDto({ ...updated, team: updated.team });
}
