import { paginateArray } from "@/lib/pagination";
import { COLLECTION_TOPICS } from "@/lib/topics-config";
import { Prisma } from "@prisma/client";
import {
  mockAuditLogs,
  mockComments,
  mockCollaborationIntents,
  mockCreators,
  mockModerationCases,
  mockPosts,
  mockProjects,
  mockReportTickets,
  mockTeamJoinRequests,
  mockTeamMemberships,
  mockTeams,
  mockUsers,
} from "@/lib/data/mock-data";
import type {
  AuditLog,
  CollaborationIntent,
  CollaborationIntentConversionMetrics,
  CollaborationIntentType,
  CollectionTopic,
  Comment,
  CreatorProfile,
  LeaderboardDiscussionRow,
  LeaderboardProjectRow,
  ModerationCase,
  Post,
  Project,
  ReportTicket,
  ReviewStatus,
  Role,
  TeamDetail,
  TeamJoinRequestRow,
  TeamJoinRequestStatus,
  TeamMember,
  TeamProjectCard,
  TeamSummary,
  User,
  WeeklyLeaderboardKind,
  WeeklyLeaderboardMaterializedRow,
  WeeklyLeaderboardMaterializedSnapshot,
  WeeklyLeaderboardPublicPayload,
} from "@/lib/types";

const useMockData = process.env.USE_MOCK_DATA !== "false";
type DemoRole = Extract<Role, "admin" | "user">;

const mockWeeklySnapshots = new Map<string, WeeklyLeaderboardMaterializedSnapshot>();

/** Monday 00:00:00.000 UTC for the ISO week containing `date`. */
export function startOfUtcWeekContaining(date: Date): Date {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dow = utc.getUTCDay();
  const daysFromMonday = (dow + 6) % 7;
  utc.setUTCDate(utc.getUTCDate() - daysFromMonday);
  utc.setUTCHours(0, 0, 0, 0);
  return utc;
}

function weeklySnapshotKey(weekStart: Date, kind: WeeklyLeaderboardKind): string {
  return `${kind}:${weekStart.toISOString()}`;
}

export function parseUtcWeekStartParam(isoDate: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!m) {
    return null;
  }
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const candidate = new Date(Date.UTC(y, mo, d, 0, 0, 0, 0));
  const normalized = startOfUtcWeekContaining(candidate);
  if (
    normalized.getUTCFullYear() !== candidate.getUTCFullYear() ||
    normalized.getUTCMonth() !== candidate.getUTCMonth() ||
    normalized.getUTCDate() !== candidate.getUTCDate()
  ) {
    return null;
  }
  return normalized;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Paginated<T> {
  items: T[];
  pagination: PaginationMeta;
}

interface ReviewPostInput {
  postId: string;
  action: "approve" | "reject";
  note?: string;
  adminUserId: string;
}

interface ReviewCollaborationIntentInput {
  intentId: string;
  action: "approve" | "reject";
  note?: string;
  adminUserId: string;
}

async function getPrisma() {
  const db = await import("@/lib/db");
  return db.prisma;
}

function normalizeModerationNote(note?: string): string | undefined {
  const value = note?.trim();
  return value ? value.slice(0, 500) : undefined;
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
  updatedAt: Date;
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
    updatedAt: project.updatedAt.toISOString(),
  };
  if (project.teamId) {
    base.teamId = project.teamId;
  }
  if (project.team) {
    base.team = { slug: project.team.slug, name: project.team.name };
  }
  return base;
}

function toCreatorDto(creator: {
  id: string;
  slug: string;
  userId: string;
  headline: string;
  bio: string;
  skills: string[];
  collaborationPreference: string;
}): CreatorProfile {
  const allowedPreference: CreatorProfile["collaborationPreference"] =
    creator.collaborationPreference === "invite_only" || creator.collaborationPreference === "closed"
      ? creator.collaborationPreference
      : "open";

  return {
    id: creator.id,
    slug: creator.slug,
    userId: creator.userId,
    headline: creator.headline,
    bio: creator.bio,
    skills: creator.skills,
    collaborationPreference: allowedPreference,
  };
}

function toUserDto(user: {
  id: string;
  email: string;
  name: string;
  role: Role;
}): User {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

function toPostDto(post: {
  id: string;
  slug: string;
  authorId: string;
  title: string;
  body: string;
  tags: string[];
  reviewStatus: ReviewStatus;
  moderationNote: string | null;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  createdAt: Date;
}): Post {
  return {
    id: post.id,
    slug: post.slug,
    authorId: post.authorId,
    title: post.title,
    body: post.body,
    tags: post.tags,
    reviewStatus: post.reviewStatus,
    moderationNote: post.moderationNote ?? undefined,
    reviewedAt: post.reviewedAt?.toISOString(),
    reviewedBy: post.reviewedBy ?? undefined,
    createdAt: post.createdAt.toISOString(),
  };
}

function toCommentDto(comment: {
  id: string;
  postId: string;
  authorId: string;
  body: string;
  createdAt: Date;
}): Comment {
  return {
    ...comment,
    createdAt: comment.createdAt.toISOString(),
  };
}

function toCollaborationIntentDto(item: {
  id: string;
  projectId: string;
  applicantId: string;
  intentType: string;
  message: string;
  contact: string | null;
  status: ReviewStatus;
  reviewNote: string | null;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  createdAt: Date;
}): CollaborationIntent {
  const intentType: CollaborationIntentType = item.intentType === "recruit" ? "recruit" : "join";

  return {
    id: item.id,
    projectId: item.projectId,
    applicantId: item.applicantId,
    intentType,
    message: item.message,
    contact: item.contact ?? undefined,
    status: item.status,
    reviewNote: item.reviewNote ?? undefined,
    reviewedAt: item.reviewedAt?.toISOString(),
    reviewedBy: item.reviewedBy ?? undefined,
    createdAt: item.createdAt.toISOString(),
  };
}

function toModerationCaseDto(item: {
  id: string;
  targetType: string;
  targetId: string;
  status: ReviewStatus;
  reason: string | null;
  note: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
  resolvedBy: string | null;
}): ModerationCase {
  return {
    id: item.id,
    targetType: "post",
    targetId: item.targetId,
    status: item.status,
    reason: item.reason ?? undefined,
    note: item.note ?? undefined,
    createdAt: item.createdAt.toISOString(),
    resolvedAt: item.resolvedAt?.toISOString(),
    resolvedBy: item.resolvedBy ?? undefined,
  };
}

function toReportTicketDto(item: {
  id: string;
  targetType: string;
  targetId: string;
  reporterId: string;
  reason: string;
  status: string;
  createdAt: Date;
  resolvedAt: Date | null;
  resolvedBy: string | null;
}): ReportTicket {
  return {
    id: item.id,
    targetType: "post",
    targetId: item.targetId,
    reporterId: item.reporterId,
    reason: item.reason,
    status: item.status === "resolved" ? "resolved" : "open",
    createdAt: item.createdAt.toISOString(),
    resolvedAt: item.resolvedAt?.toISOString(),
    resolvedBy: item.resolvedBy ?? undefined,
  };
}

function toAuditLogDto(item: {
  id: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: unknown;
  createdAt: Date;
}): AuditLog {
  return {
    id: item.id,
    actorId: item.actorId,
    action: item.action,
    entityType: item.entityType as AuditLog["entityType"],
    entityId: item.entityId,
    metadata: (item.metadata ?? undefined) as Record<string, unknown> | undefined,
    createdAt: item.createdAt.toISOString(),
  };
}

export async function listProjects(params: {
  query?: string;
  tag?: string;
  /** Matches if any `techStack` entry equals this string (case-sensitive in DB; mock compares case-insensitively). */
  tech?: string;
  status?: Project["status"];
  /** Filter by team slug (P3-3). */
  team?: string;
  page: number;
  limit: number;
}): Promise<Paginated<Project>> {
  const techFilter = params.tech?.trim();
  const statusFilter = params.status;
  const teamSlug = params.team?.trim();

  if (useMockData) {
    const teamIdFilter = teamSlug ? mockTeams.find((x) => x.slug === teamSlug)?.id : undefined;
    if (teamSlug && !teamIdFilter) {
      return {
        items: [],
        pagination: {
          page: params.page,
          limit: params.limit,
          total: 0,
          totalPages: 1,
        },
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

      const techMatch =
        !techFilter ||
        project.techStack.some((item) => item.toLowerCase() === techFilter.toLowerCase());

      const statusMatch = !statusFilter || project.status === statusFilter;

      const teamMatch = !teamIdFilter || project.teamId === teamIdFilter;

      return queryMatch && tagMatch && techMatch && statusMatch && teamMatch;
    });

    return paginateArray(filtered, params.page, params.limit);
  }

  const where = {
    AND: [
      params.query
        ? {
            OR: [
              { title: { contains: params.query, mode: "insensitive" as const } },
              { description: { contains: params.query, mode: "insensitive" as const } },
            ],
          }
        : {},
      params.tag
        ? {
            tags: {
              has: params.tag,
            },
          }
        : {},
      techFilter
        ? {
            techStack: {
              has: techFilter,
            },
          }
        : {},
      statusFilter ? { status: statusFilter } : {},
      teamSlug
        ? {
            team: {
              slug: teamSlug,
            },
          }
        : {},
    ],
  };

  const prisma = await getPrisma();
  const [items, total] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
      include: { team: { select: { slug: true, name: true } } },
    }),
    prisma.project.count({ where }),
  ]);

  return {
    items: items.map((p) => toProjectDto({ ...p, teamId: p.teamId, team: p.team })),
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / params.limit)),
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
  if (useMockData) {
    return mockProjects.find((project) => project.slug === slug) ?? null;
  }

  const prisma = await getPrisma();
  const project = await prisma.project.findUnique({
    where: { slug },
    include: { team: { select: { slug: true, name: true } } },
  });
  return project ? toProjectDto({ ...project, team: project.team }) : null;
}

export async function updateProjectTeamLink(params: {
  projectSlug: string;
  actorUserId: string;
  teamSlug: string | null;
}): Promise<Project> {
  if (useMockData) {
    const project = mockProjects.find((p) => p.slug === params.projectSlug);
    if (!project) {
      throw new Error("PROJECT_NOT_FOUND");
    }
    const creator = mockCreators.find((c) => c.id === project.creatorId);
    if (!creator || creator.userId !== params.actorUserId) {
      throw new Error("FORBIDDEN_NOT_CREATOR");
    }
    if (params.teamSlug === null || params.teamSlug === "") {
      project.teamId = undefined;
      project.team = undefined;
      return { ...project };
    }
    const slugTrim = params.teamSlug.trim();
    const team = mockTeams.find((t) => t.slug === slugTrim);
    if (!team) {
      throw new Error("TEAM_NOT_FOUND");
    }
    const isMember = mockTeamMemberships.some((m) => m.teamId === team.id && m.userId === params.actorUserId);
    if (!isMember) {
      throw new Error("FORBIDDEN_NOT_TEAM_MEMBER");
    }
    project.teamId = team.id;
    project.team = { slug: team.slug, name: team.name };
    return { ...project };
  }

  const prisma = await getPrisma();
  const project = await prisma.project.findUnique({
    where: { slug: params.projectSlug },
    include: { creator: { select: { userId: true } } },
  });
  if (!project) {
    throw new Error("PROJECT_NOT_FOUND");
  }
  if (project.creator.userId !== params.actorUserId) {
    throw new Error("FORBIDDEN_NOT_CREATOR");
  }

  if (params.teamSlug === null || params.teamSlug === "") {
    const updated = await prisma.project.update({
      where: { id: project.id },
      data: { teamId: null },
      include: { team: { select: { slug: true, name: true } } },
    });
    return toProjectDto({ ...updated, team: updated.team });
  }

  const slugTrim = params.teamSlug.trim();
  const team = await prisma.team.findUnique({
    where: { slug: slugTrim },
    select: { id: true },
  });
  if (!team) {
    throw new Error("TEAM_NOT_FOUND");
  }

  const membership = await prisma.teamMembership.findUnique({
    where: { teamId_userId: { teamId: team.id, userId: params.actorUserId } },
  });
  if (!membership) {
    throw new Error("FORBIDDEN_NOT_TEAM_MEMBER");
  }

  const updated = await prisma.project.update({
    where: { id: project.id },
    data: { teamId: team.id },
    include: { team: { select: { slug: true, name: true } } },
  });
  return toProjectDto({ ...updated, team: updated.team });
}

export async function listTeamsForUser(userId: string): Promise<TeamSummary[]> {
  if (useMockData) {
    const teamIds = new Set(
      mockTeamMemberships.filter((m) => m.userId === userId).map((m) => m.teamId)
    );
    return mockTeams
      .filter((t) => teamIds.has(t.id))
      .map((t) => ({
        id: t.id,
        slug: t.slug,
        name: t.name,
        mission: t.mission,
        ownerUserId: t.ownerUserId,
        memberCount: mockTeamMemberships.filter((m) => m.teamId === t.id).length,
        projectCount: mockProjects.filter((p) => p.teamId === t.id).length,
        createdAt: t.createdAt,
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  const prisma = await getPrisma();
  const rows = await prisma.team.findMany({
    where: { memberships: { some: { userId } } },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { memberships: true, projects: true } },
    },
  });
  return rows.map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
    mission: t.mission ?? undefined,
    ownerUserId: t.ownerUserId,
    memberCount: t._count.memberships,
    projectCount: t._count.projects,
    createdAt: t.createdAt.toISOString(),
  }));
}

export async function listCreators(params: {
  query?: string;
  page: number;
  limit: number;
}): Promise<Paginated<CreatorProfile>> {
  if (useMockData) {
    const filtered = mockCreators.filter((creator) => {
      if (!params.query) {
        return true;
      }
      const q = params.query.toLowerCase().trim();
      return (
        creator.slug.toLowerCase().includes(q) ||
        creator.bio.toLowerCase().includes(q) ||
        creator.skills.some((skill) => skill.toLowerCase().includes(q))
      );
    });

    return paginateArray(filtered, params.page, params.limit);
  }

  const where = params.query
    ? {
        OR: [
          { slug: { contains: params.query, mode: "insensitive" as const } },
          { bio: { contains: params.query, mode: "insensitive" as const } },
        ],
      }
    : {};

  const prisma = await getPrisma();
  const [items, total] = await Promise.all([
    prisma.creatorProfile.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
    }),
    prisma.creatorProfile.count({ where }),
  ]);

  return {
    items: items.map(toCreatorDto),
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / params.limit)),
    },
  };
}

export async function getCreatorBySlug(slug: string): Promise<CreatorProfile | null> {
  if (useMockData) {
    return mockCreators.find((creator) => creator.slug === slug) ?? null;
  }

  const prisma = await getPrisma();
  const creator = await prisma.creatorProfile.findUnique({
    where: { slug },
  });
  return creator ? toCreatorDto(creator) : null;
}

export async function getCreatorProfileById(creatorId: string): Promise<CreatorProfile | null> {
  if (useMockData) {
    return mockCreators.find((c) => c.id === creatorId) ?? null;
  }

  const prisma = await getPrisma();
  const creator = await prisma.creatorProfile.findUnique({
    where: { id: creatorId },
  });
  return creator ? toCreatorDto(creator) : null;
}

export async function listUsers(params: {
  query?: string;
  page: number;
  limit: number;
}): Promise<Paginated<User>> {
  if (useMockData) {
    const filtered = mockUsers.filter((user) => {
      const q = params.query?.toLowerCase().trim();
      if (!q) {
        return true;
      }
      return user.name.toLowerCase().includes(q) || user.email.toLowerCase().includes(q);
    });
    return paginateArray(filtered, params.page, params.limit);
  }

  const prisma = await getPrisma();
  const where = params.query
    ? {
        OR: [
          { name: { contains: params.query, mode: "insensitive" as const } },
          { email: { contains: params.query, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    items: items.map(toUserDto),
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / params.limit)),
    },
  };
}

export async function listPosts(params: {
  query?: string;
  tag?: string;
  page: number;
  limit: number;
}): Promise<Paginated<Post>> {
  if (useMockData) {
    const filtered = mockPosts.filter((post) => {
      const q = params.query?.toLowerCase().trim();
      const t = params.tag?.toLowerCase().trim();
      const queryMatch =
        !q ||
        post.title.toLowerCase().includes(q) ||
        post.body.toLowerCase().includes(q) ||
        post.tags.some((tag) => tag.toLowerCase().includes(q));
      const tagMatch = !t || post.tags.some((tag) => tag.toLowerCase() === t);
      const approvedOnly = post.reviewStatus === "approved";
      return queryMatch && tagMatch && approvedOnly;
    });

    return paginateArray(filtered, params.page, params.limit);
  }

  const where = {
    AND: [
      { reviewStatus: "approved" as const },
      params.query
        ? {
            OR: [
              { title: { contains: params.query, mode: "insensitive" as const } },
              { body: { contains: params.query, mode: "insensitive" as const } },
            ],
          }
        : {},
      params.tag
        ? {
            tags: {
              has: params.tag,
            },
          }
        : {},
    ],
  };

  const prisma = await getPrisma();
  const [items, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
    }),
    prisma.post.count({ where }),
  ]);

  return {
    items: items.map(toPostDto),
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / params.limit)),
    },
  };
}

export async function listPostsForModeration(params: {
  status?: ReviewStatus | "all";
  query?: string;
  page: number;
  limit: number;
}): Promise<Paginated<Post>> {
  if (useMockData) {
    const filtered = mockPosts.filter((post) => {
      const query = params.query?.toLowerCase().trim();
      const statusMatch = !params.status || params.status === "all" || post.reviewStatus === params.status;
      const queryMatch =
        !query ||
        post.title.toLowerCase().includes(query) ||
        post.body.toLowerCase().includes(query) ||
        post.tags.some((tag) => tag.toLowerCase().includes(query));
      return statusMatch && queryMatch;
    });
    return paginateArray(filtered, params.page, params.limit);
  }

  const prisma = await getPrisma();
  const where = {
    AND: [
      params.status && params.status !== "all" ? { reviewStatus: params.status } : {},
      params.query
        ? {
            OR: [
              { title: { contains: params.query, mode: "insensitive" as const } },
              { body: { contains: params.query, mode: "insensitive" as const } },
            ],
          }
        : {},
    ],
  };

  const [items, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: [{ reviewStatus: "asc" }, { createdAt: "desc" }],
      skip: (params.page - 1) * params.limit,
      take: params.limit,
    }),
    prisma.post.count({ where }),
  ]);

  return {
    items: items.map(toPostDto),
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / params.limit)),
    },
  };
}

export async function createPost(input: {
  title: string;
  body: string;
  tags: string[];
  authorId: string;
}) {
  const slug = input.title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

  if (useMockData) {
    const post: Post = {
      id: `post_${Date.now()}`,
      slug: `${slug}-${Date.now()}`,
      authorId: input.authorId,
      title: input.title,
      body: input.body,
      tags: input.tags,
      reviewStatus: "pending",
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
    return post;
  }

  const prisma = await getPrisma();
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

    return post;
  });

  return toPostDto(result);
}

export async function createComment(input: { postId: string; body: string; authorId: string }) {
  if (useMockData) {
    const postExists = mockPosts.some((post) => post.id === input.postId);
    if (!postExists) {
      throw new Error("POST_NOT_FOUND");
    }

    const comment: Comment = {
      id: `cm_${Date.now()}`,
      postId: input.postId,
      authorId: input.authorId,
      body: input.body,
      createdAt: new Date().toISOString(),
    };
    mockComments.unshift(comment);
    return comment;
  }

  const prisma = await getPrisma();
  const post = await prisma.post.findUnique({
    where: { id: input.postId },
    select: { id: true, reviewStatus: true },
  });
  if (!post || post.reviewStatus !== "approved") {
    throw new Error("POST_NOT_FOUND");
  }

  const comment = await prisma.comment.create({
    data: {
      postId: input.postId,
      body: input.body,
      authorId: input.authorId,
    },
  });
  return toCommentDto(comment);
}

export async function listProjectCollaborationIntents(params: {
  projectId: string;
  status?: ReviewStatus | "all";
  page: number;
  limit: number;
}): Promise<Paginated<CollaborationIntent>> {
  if (useMockData) {
    const filtered = mockCollaborationIntents.filter((item) => {
      const projectMatch = item.projectId === params.projectId;
      const statusMatch = !params.status || params.status === "all" || item.status === params.status;
      return projectMatch && statusMatch;
    });

    return paginateArray(filtered, params.page, params.limit);
  }

  const prisma = await getPrisma();
  const where = {
    AND: [
      { projectId: params.projectId },
      params.status && params.status !== "all" ? { status: params.status } : {},
    ],
  };

  const [items, total] = await Promise.all([
    prisma.collaborationIntent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
    }),
    prisma.collaborationIntent.count({ where }),
  ]);

  return {
    items: items.map(toCollaborationIntentDto),
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / params.limit)),
    },
  };
}

export async function createCollaborationIntent(input: {
  projectId: string;
  applicantId: string;
  intentType: CollaborationIntentType;
  message: string;
  contact?: string;
}): Promise<CollaborationIntent> {
  const message = input.message.trim();
  const contact = input.contact?.trim();

  if (useMockData) {
    const projectExists = mockProjects.some((project) => project.id === input.projectId);
    if (!projectExists) {
      throw new Error("PROJECT_NOT_FOUND");
    }
    const applicantExists = mockUsers.some((user) => user.id === input.applicantId);
    if (!applicantExists) {
      throw new Error("USER_NOT_FOUND");
    }

    const intent: CollaborationIntent = {
      id: `ci_${Date.now()}`,
      projectId: input.projectId,
      applicantId: input.applicantId,
      intentType: input.intentType,
      message,
      contact: contact || undefined,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    mockCollaborationIntents.unshift(intent);
    mockAuditLogs.unshift({
      id: `log_${Date.now()}`,
      actorId: input.applicantId,
      action: "collaboration_intent_created",
      entityType: "collaboration_intent",
      entityId: intent.id,
      metadata: {
        projectId: input.projectId,
        intentType: input.intentType,
      },
      createdAt: new Date().toISOString(),
    });
    return intent;
  }

  const prisma = await getPrisma();
  const createdIntent = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const [project, user] = await Promise.all([
      tx.project.findUnique({
        where: { id: input.projectId },
        select: { id: true },
      }),
      tx.user.findUnique({
        where: { id: input.applicantId },
        select: { id: true },
      }),
    ]);

    if (!project) {
      throw new Error("PROJECT_NOT_FOUND");
    }
    if (!user) {
      throw new Error("USER_NOT_FOUND");
    }

    const intent = await tx.collaborationIntent.create({
      data: {
        projectId: input.projectId,
        applicantId: input.applicantId,
        intentType: input.intentType,
        message,
        contact: contact || null,
        status: "pending",
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: input.applicantId,
        action: "collaboration_intent_created",
        entityType: "collaboration_intent",
        entityId: intent.id,
        metadata: {
          projectId: input.projectId,
          intentType: input.intentType,
        },
      },
    });

    return intent;
  });

  return toCollaborationIntentDto(createdIntent);
}

export async function listCollaborationIntentsForModeration(params: {
  status?: ReviewStatus | "all";
  projectId?: string;
  page: number;
  limit: number;
}): Promise<Paginated<CollaborationIntent>> {
  if (useMockData) {
    const filtered = mockCollaborationIntents.filter((item) => {
      const statusMatch = !params.status || params.status === "all" || item.status === params.status;
      const projectMatch = !params.projectId || item.projectId === params.projectId;
      return statusMatch && projectMatch;
    });
    return paginateArray(filtered, params.page, params.limit);
  }

  const prisma = await getPrisma();
  const where = {
    AND: [
      params.status && params.status !== "all" ? { status: params.status } : {},
      params.projectId ? { projectId: params.projectId } : {},
    ],
  };

  const [items, total] = await Promise.all([
    prisma.collaborationIntent.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      skip: (params.page - 1) * params.limit,
      take: params.limit,
    }),
    prisma.collaborationIntent.count({ where }),
  ]);

  return {
    items: items.map(toCollaborationIntentDto),
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / params.limit)),
    },
  };
}

export async function reviewCollaborationIntent(
  input: ReviewCollaborationIntentInput
): Promise<CollaborationIntent> {
  const nextStatus: ReviewStatus = input.action === "approve" ? "approved" : "rejected";
  const note = normalizeModerationNote(input.note);

  if (useMockData) {
    const intent = mockCollaborationIntents.find((item) => item.id === input.intentId);
    if (!intent) {
      throw new Error("COLLABORATION_INTENT_NOT_FOUND");
    }

    intent.status = nextStatus;
    intent.reviewNote = note;
    intent.reviewedAt = new Date().toISOString();
    intent.reviewedBy = input.adminUserId;

    mockAuditLogs.unshift({
      id: `log_${Date.now()}`,
      actorId: input.adminUserId,
      action: `collaboration_intent_${nextStatus}`,
      entityType: "collaboration_intent",
      entityId: input.intentId,
      metadata: { note },
      createdAt: new Date().toISOString(),
    });

    return intent;
  }

  const prisma = await getPrisma();
  const updatedIntent = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const intent = await tx.collaborationIntent.findUnique({
      where: { id: input.intentId },
    });
    if (!intent) {
      throw new Error("COLLABORATION_INTENT_NOT_FOUND");
    }

    const updated = await tx.collaborationIntent.update({
      where: { id: input.intentId },
      data: {
        status: nextStatus,
        reviewNote: note ?? null,
        reviewedAt: new Date(),
        reviewedBy: input.adminUserId,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: input.adminUserId,
        action: `collaboration_intent_${nextStatus}`,
        entityType: "collaboration_intent",
        entityId: input.intentId,
        metadata: { note },
      },
    });

    return updated;
  });

  return toCollaborationIntentDto(updatedIntent);
}

export async function reviewPost(input: ReviewPostInput): Promise<Post> {
  const nextStatus: ReviewStatus = input.action === "approve" ? "approved" : "rejected";
  const note = normalizeModerationNote(input.note);

  if (useMockData) {
    const post = mockPosts.find((item) => item.id === input.postId);
    if (!post) {
      throw new Error("POST_NOT_FOUND");
    }

    post.reviewStatus = nextStatus;
    post.reviewedAt = new Date().toISOString();
    post.reviewedBy = input.adminUserId;
    post.moderationNote = note;

    const existingCase = mockModerationCases.find(
      (item) => item.targetId === input.postId && item.status === "pending"
    );
    if (existingCase) {
      existingCase.status = nextStatus;
      existingCase.note = note;
      existingCase.resolvedAt = new Date().toISOString();
      existingCase.resolvedBy = input.adminUserId;
    } else {
      mockModerationCases.unshift({
        id: `mc_${Date.now()}`,
        targetType: "post",
        targetId: input.postId,
        status: nextStatus,
        reason: "manual_review",
        note,
        createdAt: new Date().toISOString(),
        resolvedAt: new Date().toISOString(),
        resolvedBy: input.adminUserId,
      });
    }

    mockReportTickets
      .filter((ticket) => ticket.targetId === input.postId && ticket.status === "open")
      .forEach((ticket) => {
        ticket.status = "resolved";
        ticket.resolvedAt = new Date().toISOString();
        ticket.resolvedBy = input.adminUserId;
      });

    mockAuditLogs.unshift({
      id: `log_${Date.now()}`,
      actorId: input.adminUserId,
      action: `post_${nextStatus}`,
      entityType: "post",
      entityId: input.postId,
      metadata: { note },
      createdAt: new Date().toISOString(),
    });

    return post;
  }

  const prisma = await getPrisma();
  const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const post = await tx.post.findUnique({
      where: { id: input.postId },
    });
    if (!post) {
      throw new Error("POST_NOT_FOUND");
    }

    const updatedPost = await tx.post.update({
      where: { id: input.postId },
      data: {
        reviewStatus: nextStatus,
        moderationNote: note ?? null,
        reviewedAt: new Date(),
        reviewedBy: input.adminUserId,
      },
    });

    const pendingCases = await tx.moderationCase.findMany({
      where: {
        targetType: "post",
        targetId: input.postId,
        status: "pending",
      },
      select: { id: true },
    });

    if (pendingCases.length > 0) {
      const pendingCaseIds = pendingCases.map((item: { id: string }) => item.id);
      await tx.moderationCase.updateMany({
        where: { id: { in: pendingCaseIds } },
        data: {
          status: nextStatus,
          note: note ?? null,
          resolvedAt: new Date(),
          resolvedBy: input.adminUserId,
        },
      });
    } else {
      await tx.moderationCase.create({
        data: {
          targetType: "post",
          targetId: input.postId,
          postId: input.postId,
          status: nextStatus,
          reason: "manual_review",
          note: note ?? null,
          resolvedAt: new Date(),
          resolvedBy: input.adminUserId,
        },
      });
    }

    await tx.reportTicket.updateMany({
      where: {
        targetType: "post",
        targetId: input.postId,
        status: "open",
      },
      data: {
        status: "resolved",
        resolvedAt: new Date(),
        resolvedBy: input.adminUserId,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: input.adminUserId,
        action: `post_${nextStatus}`,
        entityType: "post",
        entityId: input.postId,
        metadata: { note },
      },
    });

    return updatedPost;
  });

  return toPostDto(updated);
}

export async function listModerationCases(params: {
  status?: ReviewStatus | "all";
  page: number;
  limit: number;
}): Promise<Paginated<ModerationCase>> {
  if (useMockData) {
    const filtered = mockModerationCases.filter((item) => {
      return !params.status || params.status === "all" || item.status === params.status;
    });
    return paginateArray(filtered, params.page, params.limit);
  }

  const prisma = await getPrisma();
  const where = params.status && params.status !== "all" ? { status: params.status } : {};
  const [items, total] = await Promise.all([
    prisma.moderationCase.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      skip: (params.page - 1) * params.limit,
      take: params.limit,
    }),
    prisma.moderationCase.count({ where }),
  ]);

  return {
    items: items.map(toModerationCaseDto),
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / params.limit)),
    },
  };
}

export async function listReportTickets(params: {
  status?: "open" | "resolved" | "all";
  page: number;
  limit: number;
}): Promise<Paginated<ReportTicket>> {
  if (useMockData) {
    const filtered = mockReportTickets.filter((item) => {
      return !params.status || params.status === "all" || item.status === params.status;
    });
    return paginateArray(filtered, params.page, params.limit);
  }

  const prisma = await getPrisma();
  const where = params.status && params.status !== "all" ? { status: params.status } : {};
  const [items, total] = await Promise.all([
    prisma.reportTicket.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      skip: (params.page - 1) * params.limit,
      take: params.limit,
    }),
    prisma.reportTicket.count({ where }),
  ]);

  return {
    items: items.map(toReportTicketDto),
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / params.limit)),
    },
  };
}

export async function listAuditLogs(params: {
  actorId?: string;
  page: number;
  limit: number;
}): Promise<Paginated<AuditLog>> {
  if (useMockData) {
    const filtered = mockAuditLogs.filter((item) => {
      return !params.actorId || item.actorId === params.actorId;
    });
    return paginateArray(filtered, params.page, params.limit);
  }

  const prisma = await getPrisma();
  const where = params.actorId ? { actorId: params.actorId } : {};
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    items: items.map(toAuditLogDto),
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / params.limit)),
    },
  };
}

export function listCollectionTopics(): CollectionTopic[] {
  return COLLECTION_TOPICS.map((topic) => ({
    slug: topic.slug,
    title: topic.title,
    description: topic.description,
    tag: topic.tag,
  }));
}

export async function getTopicDiscovery(slug: string): Promise<{
  topic: CollectionTopic;
  posts: Paginated<Post>;
  projects: Paginated<Project>;
} | null> {
  const config = COLLECTION_TOPICS.find((item) => item.slug === slug);
  if (!config) {
    return null;
  }

  const topic: CollectionTopic = {
    slug: config.slug,
    title: config.title,
    description: config.description,
    tag: config.tag,
  };

  const [posts, projects] = await Promise.all([
    listPosts({ tag: config.tag, page: 1, limit: 12 }),
    listProjects({ tag: config.tag, page: 1, limit: 12 }),
  ]);

  return { topic, posts, projects };
}

export async function getDiscussionLeaderboard(limit: number): Promise<LeaderboardDiscussionRow[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 50);

  if (useMockData) {
    const approved = mockPosts.filter((p) => p.reviewStatus === "approved");
    const rows: LeaderboardDiscussionRow[] = approved.map((post) => ({
      postId: post.id,
      slug: post.slug,
      title: post.title,
      commentCount: mockComments.filter((c) => c.postId === post.id).length,
    }));
    rows.sort((a, b) => b.commentCount - a.commentCount || b.title.localeCompare(a.title));
    return rows.slice(0, safeLimit);
  }

  const prisma = await getPrisma();
  const rows = await prisma.$queryRaw<
    { id: string; slug: string; title: string; comment_count: bigint }[]
  >`
    SELECT p.id, p.slug, p.title, COUNT(c.id)::bigint AS comment_count
    FROM "Post" p
    LEFT JOIN "Comment" c ON c."postId" = p.id
    WHERE p."reviewStatus" = 'approved'
    GROUP BY p.id, p.slug, p.title
    ORDER BY COUNT(c.id) DESC, p.title ASC
    LIMIT ${safeLimit}
  `;

  return rows.map((row) => ({
    postId: row.id,
    slug: row.slug,
    title: row.title,
    commentCount: Number(row.comment_count),
  }));
}

export async function getProjectCollaborationLeaderboard(limit: number): Promise<LeaderboardProjectRow[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 50);

  if (useMockData) {
    const rows: LeaderboardProjectRow[] = mockProjects.map((project) => ({
      projectId: project.id,
      slug: project.slug,
      title: project.title,
      intentCount: mockCollaborationIntents.filter((i) => i.projectId === project.id).length,
    }));
    rows.sort((a, b) => b.intentCount - a.intentCount || a.title.localeCompare(b.title));
    return rows.slice(0, safeLimit);
  }

  const prisma = await getPrisma();
  const rows = await prisma.$queryRaw<
    { id: string; slug: string; title: string; intent_count: bigint }[]
  >`
    SELECT pr.id, pr.slug, pr.title, COUNT(ci.id)::bigint AS intent_count
    FROM "Project" pr
    LEFT JOIN "CollaborationIntent" ci ON ci."projectId" = pr.id
    GROUP BY pr.id, pr.slug, pr.title
    ORDER BY COUNT(ci.id) DESC, pr.title ASC
    LIMIT ${safeLimit}
  `;

  return rows.map((row) => ({
    projectId: row.id,
    slug: row.slug,
    title: row.title,
    intentCount: Number(row.intent_count),
  }));
}

export async function getWeeklyDiscussionLeaderboard(
  weekStart: Date,
  limit: number
): Promise<LeaderboardDiscussionRow[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const weekEnd = new Date(weekStart.getTime());
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

  if (useMockData) {
    const approved = mockPosts.filter((p) => p.reviewStatus === "approved");
    const rows: LeaderboardDiscussionRow[] = approved.map((post) => ({
      postId: post.id,
      slug: post.slug,
      title: post.title,
      commentCount: mockComments.filter((c) => {
        if (c.postId !== post.id) {
          return false;
        }
        const t = new Date(c.createdAt).getTime();
        return t >= weekStart.getTime() && t < weekEnd.getTime();
      }).length,
    }));
    rows.sort((a, b) => b.commentCount - a.commentCount || b.title.localeCompare(a.title));
    return rows.slice(0, safeLimit);
  }

  const prisma = await getPrisma();
  const rows = await prisma.$queryRaw<
    { id: string; slug: string; title: string; comment_count: bigint }[]
  >`
    SELECT p.id, p.slug, p.title, COUNT(c.id)::bigint AS comment_count
    FROM "Post" p
    LEFT JOIN "Comment" c ON c."postId" = p.id
      AND c."createdAt" >= ${weekStart}
      AND c."createdAt" < ${weekEnd}
    WHERE p."reviewStatus" = 'approved'
    GROUP BY p.id, p.slug, p.title
    ORDER BY COUNT(c.id) DESC, p.title ASC
    LIMIT ${safeLimit}
  `;

  return rows.map((row) => ({
    postId: row.id,
    slug: row.slug,
    title: row.title,
    commentCount: Number(row.comment_count),
  }));
}

export async function getWeeklyProjectCollaborationLeaderboard(
  weekStart: Date,
  limit: number
): Promise<LeaderboardProjectRow[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const weekEnd = new Date(weekStart.getTime());
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

  if (useMockData) {
    const rows: LeaderboardProjectRow[] = mockProjects.map((project) => ({
      projectId: project.id,
      slug: project.slug,
      title: project.title,
      intentCount: mockCollaborationIntents.filter((i) => {
        if (i.projectId !== project.id) {
          return false;
        }
        const t = new Date(i.createdAt).getTime();
        return t >= weekStart.getTime() && t < weekEnd.getTime();
      }).length,
    }));
    rows.sort((a, b) => b.intentCount - a.intentCount || a.title.localeCompare(b.title));
    return rows.slice(0, safeLimit);
  }

  const prisma = await getPrisma();
  const rows = await prisma.$queryRaw<
    { id: string; slug: string; title: string; intent_count: bigint }[]
  >`
    SELECT pr.id, pr.slug, pr.title, COUNT(ci.id)::bigint AS intent_count
    FROM "Project" pr
    LEFT JOIN "CollaborationIntent" ci ON ci."projectId" = pr.id
      AND ci."createdAt" >= ${weekStart}
      AND ci."createdAt" < ${weekEnd}
    GROUP BY pr.id, pr.slug, pr.title
    ORDER BY COUNT(ci.id) DESC, pr.title ASC
    LIMIT ${safeLimit}
  `;

  return rows.map((row) => ({
    projectId: row.id,
    slug: row.slug,
    title: row.title,
    intentCount: Number(row.intent_count),
  }));
}

export async function getMaterializedWeeklyLeaderboardSnapshot(
  weekStart: Date,
  kind: WeeklyLeaderboardKind
): Promise<WeeklyLeaderboardMaterializedSnapshot | null> {
  if (useMockData) {
    return mockWeeklySnapshots.get(weeklySnapshotKey(weekStart, kind)) ?? null;
  }

  const prisma = await getPrisma();
  const prismaKind =
    kind === "discussions_by_weekly_comment_count"
      ? "discussions_by_weekly_comment_count"
      : "projects_by_weekly_collaboration_intent_count";

  const snapshot = await prisma.weeklyLeaderboardSnapshot.findUnique({
    where: {
      weekStart_kind: { weekStart, kind: prismaKind },
    },
    include: {
      rows: { orderBy: { rank: "asc" } },
    },
  });

  if (!snapshot) {
    return null;
  }

  return {
    weekStart: snapshot.weekStart.toISOString(),
    generatedAt: snapshot.generatedAt.toISOString(),
    kind: snapshot.kind as WeeklyLeaderboardKind,
    rows: snapshot.rows.map((r) => ({
      rank: r.rank,
      entityId: r.entityId,
      slug: r.slug,
      title: r.title,
      score: r.score,
    })),
  };
}

export async function materializeWeeklyLeaderboardSnapshot(params: {
  weekStart: Date;
  kind: WeeklyLeaderboardKind;
  limit: number;
  actorId: string;
}): Promise<WeeklyLeaderboardMaterializedSnapshot> {
  const safeLimit = Math.min(Math.max(params.limit, 1), 50);
  const generatedAt = new Date();

  if (useMockData) {
    const discussionRows = await getWeeklyDiscussionLeaderboard(params.weekStart, safeLimit);
    const projectRows = await getWeeklyProjectCollaborationLeaderboard(params.weekStart, safeLimit);

    const rows: WeeklyLeaderboardMaterializedRow[] =
      params.kind === "discussions_by_weekly_comment_count"
        ? discussionRows.map((r, i) => ({
            rank: i + 1,
            entityId: r.postId,
            slug: r.slug,
            title: r.title,
            score: r.commentCount,
          }))
        : projectRows.map((r, i) => ({
            rank: i + 1,
            entityId: r.projectId,
            slug: r.slug,
            title: r.title,
            score: r.intentCount,
          }));

    const snapshot: WeeklyLeaderboardMaterializedSnapshot = {
      weekStart: params.weekStart.toISOString(),
      generatedAt: generatedAt.toISOString(),
      kind: params.kind,
      rows,
    };
    mockWeeklySnapshots.set(weeklySnapshotKey(params.weekStart, params.kind), snapshot);

    mockAuditLogs.unshift({
      id: `log_wk_${Date.now()}`,
      actorId: params.actorId,
      action: "weekly_leaderboard_materialized",
      entityType: "system",
      entityId: weeklySnapshotKey(params.weekStart, params.kind),
      metadata: {
        weekStart: params.weekStart.toISOString(),
        kind: params.kind,
        rowCount: rows.length,
      },
      createdAt: generatedAt.toISOString(),
    });

    return snapshot;
  }

  const prisma = await getPrisma();
  const prismaKind =
    params.kind === "discussions_by_weekly_comment_count"
      ? "discussions_by_weekly_comment_count"
      : "projects_by_weekly_collaboration_intent_count";

  const discussionRows = await getWeeklyDiscussionLeaderboard(params.weekStart, safeLimit);
  const projectRows = await getWeeklyProjectCollaborationLeaderboard(params.weekStart, safeLimit);

  const rowsPayload =
    params.kind === "discussions_by_weekly_comment_count"
      ? discussionRows.map((r, i) => ({
          rank: i + 1,
          entityId: r.postId,
          score: r.commentCount,
          slug: r.slug,
          title: r.title,
        }))
      : projectRows.map((r, i) => ({
          rank: i + 1,
          entityId: r.projectId,
          score: r.intentCount,
          slug: r.slug,
          title: r.title,
        }));

  const snapshot = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.weeklyLeaderboardSnapshot.deleteMany({
      where: { weekStart: params.weekStart, kind: prismaKind },
    });

    const created = await tx.weeklyLeaderboardSnapshot.create({
      data: {
        weekStart: params.weekStart,
        kind: prismaKind,
        generatedAt,
        rows: {
          create: rowsPayload,
        },
      },
      include: { rows: { orderBy: { rank: "asc" } } },
    });

    await tx.auditLog.create({
      data: {
        actorId: params.actorId,
        action: "weekly_leaderboard_materialized",
        entityType: "system",
        entityId: `${prismaKind}:${params.weekStart.toISOString()}`,
        metadata: {
          weekStart: params.weekStart.toISOString(),
          kind: params.kind,
          rowCount: rowsPayload.length,
        },
      },
    });

    return created;
  });

  return {
    weekStart: snapshot.weekStart.toISOString(),
    generatedAt: snapshot.generatedAt.toISOString(),
    kind: snapshot.kind as WeeklyLeaderboardKind,
    rows: snapshot.rows.map((r) => ({
      rank: r.rank,
      entityId: r.entityId,
      slug: r.slug,
      title: r.title,
      score: r.score,
    })),
  };
}

export async function getWeeklyLeaderboardPublicPayload(params: {
  weekStart: Date;
  kind: WeeklyLeaderboardKind;
  limit: number;
}): Promise<WeeklyLeaderboardPublicPayload> {
  const safeLimit = Math.min(Math.max(params.limit, 1), 50);
  const materialized = await getMaterializedWeeklyLeaderboardSnapshot(params.weekStart, params.kind);
  if (materialized) {
    return {
      weekStart: materialized.weekStart,
      kind: materialized.kind,
      source: "materialized",
      generatedAt: materialized.generatedAt,
      rows: materialized.rows.slice(0, safeLimit),
    };
  }

  if (params.kind === "discussions_by_weekly_comment_count") {
    const live = await getWeeklyDiscussionLeaderboard(params.weekStart, safeLimit);
    return {
      weekStart: params.weekStart.toISOString(),
      kind: params.kind,
      source: "live",
      rows: live.map((r, i) => ({
        rank: i + 1,
        entityId: r.postId,
        slug: r.slug,
        title: r.title,
        score: r.commentCount,
      })),
    };
  }

  const live = await getWeeklyProjectCollaborationLeaderboard(params.weekStart, safeLimit);
  return {
    weekStart: params.weekStart.toISOString(),
    kind: params.kind,
    source: "live",
    rows: live.map((r, i) => ({
      rank: i + 1,
      entityId: r.projectId,
      slug: r.slug,
      title: r.title,
      score: r.intentCount,
    })),
  };
}

export async function getCollaborationIntentConversionMetrics(): Promise<CollaborationIntentConversionMetrics> {
  if (useMockData) {
    const totalSubmissions = mockCollaborationIntents.length;
    const pending = mockCollaborationIntents.filter((i) => i.status === "pending").length;
    const approved = mockCollaborationIntents.filter((i) => i.status === "approved").length;
    const rejected = mockCollaborationIntents.filter((i) => i.status === "rejected").length;
    const reviewed = approved + rejected;
    return {
      totalSubmissions,
      pending,
      approved,
      rejected,
      approvalRate: totalSubmissions === 0 ? 0 : approved / totalSubmissions,
      reviewedApprovalRate: reviewed === 0 ? 0 : approved / reviewed,
    };
  }

  const prisma = await getPrisma();
  const [totalSubmissions, pending, approved, rejected] = await Promise.all([
    prisma.collaborationIntent.count(),
    prisma.collaborationIntent.count({ where: { status: "pending" } }),
    prisma.collaborationIntent.count({ where: { status: "approved" } }),
    prisma.collaborationIntent.count({ where: { status: "rejected" } }),
  ]);

  const reviewed = approved + rejected;
  return {
    totalSubmissions,
    pending,
    approved,
    rejected,
    approvalRate: totalSubmissions === 0 ? 0 : approved / totalSubmissions,
    reviewedApprovalRate: reviewed === 0 ? 0 : approved / reviewed,
  };
}

export async function getAdminOverview() {
  const collaborationIntentFunnel = await getCollaborationIntentConversionMetrics();

  if (useMockData) {
    const pendingPosts = mockPosts.filter((item) => item.reviewStatus === "pending").length;
    const openReports = mockReportTickets.filter((item) => item.status === "open").length;
    const moderationCases = mockModerationCases.filter((item) => item.status === "pending").length;
    const pendingCollaborationIntents = mockCollaborationIntents.filter(
      (item) => item.status === "pending"
    ).length;

    return {
      users: mockUsers.length,
      posts: mockPosts.length,
      pendingPosts,
      openReports,
      moderationCases,
      pendingCollaborationIntents,
      auditLogs: mockAuditLogs.length,
      collaborationIntentFunnel,
    };
  }

  const prisma = await getPrisma();
  const [users, posts, pendingPosts, openReports, moderationCases, pendingCollaborationIntents, auditLogs] =
    await Promise.all([
    prisma.user.count(),
    prisma.post.count(),
    prisma.post.count({ where: { reviewStatus: "pending" } }),
    prisma.reportTicket.count({ where: { status: "open" } }),
    prisma.moderationCase.count({ where: { status: "pending" } }),
    prisma.collaborationIntent.count({ where: { status: "pending" } }),
    prisma.auditLog.count(),
    ]);

  return {
    users,
    posts,
    pendingPosts,
    openReports,
    moderationCases,
    pendingCollaborationIntents,
    auditLogs,
    collaborationIntentFunnel,
  };
}

function slugifyTeamSlug(raw: string): string {
  const s = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return s || "team";
}

function mockTeamMemberRows(teamId: string): TeamMember[] {
  return mockTeamMemberships
    .filter((m) => m.teamId === teamId)
    .map((m) => {
      const user = mockUsers.find((u) => u.id === m.userId);
      return {
        userId: m.userId,
        name: user?.name ?? "Unknown",
        email: user?.email ?? "",
        role: m.role,
        joinedAt: m.joinedAt,
      };
    })
    .sort((a, b) => {
      if (a.role === "owner") {
        return -1;
      }
      if (b.role === "owner") {
        return 1;
      }
      return a.joinedAt.localeCompare(b.joinedAt);
    });
}

function toTeamSummary(
  team: { id: string; slug: string; name: string; mission: string | null; ownerUserId: string; createdAt: Date },
  memberCount: number,
  projectCount: number
): TeamSummary {
  return {
    id: team.id,
    slug: team.slug,
    name: team.name,
    mission: team.mission ?? undefined,
    ownerUserId: team.ownerUserId,
    memberCount,
    projectCount,
    createdAt: team.createdAt.toISOString(),
  };
}

export async function listTeams(params: { page: number; limit: number }): Promise<Paginated<TeamSummary>> {
  if (useMockData) {
    const sorted = [...mockTeams].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const pageResult = paginateArray(sorted, params.page, params.limit);
    return {
      items: pageResult.items.map((t) => ({
        id: t.id,
        slug: t.slug,
        name: t.name,
        mission: t.mission,
        ownerUserId: t.ownerUserId,
        memberCount: mockTeamMemberships.filter((m) => m.teamId === t.id).length,
        projectCount: mockProjects.filter((p) => p.teamId === t.id).length,
        createdAt: t.createdAt,
      })),
      pagination: pageResult.pagination,
    };
  }

  const prisma = await getPrisma();
  const skip = (params.page - 1) * params.limit;
  const [rows, total] = await Promise.all([
    prisma.team.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: params.limit,
      include: { _count: { select: { memberships: true, projects: true } } },
    }),
    prisma.team.count(),
  ]);

  return {
    items: rows.map((t) => toTeamSummary(t, t._count.memberships, t._count.projects)),
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / params.limit)),
    },
  };
}

function toTeamJoinRequestRowMock(r: {
  id: string;
  teamId: string;
  applicantId: string;
  message: string;
  status: TeamJoinRequestStatus;
  reviewedAt?: string;
  createdAt: string;
}): TeamJoinRequestRow {
  const u = mockUsers.find((x) => x.id === r.applicantId);
  return {
    id: r.id,
    teamId: r.teamId,
    applicantId: r.applicantId,
    applicantName: u?.name ?? "Unknown",
    applicantEmail: u?.email ?? "",
    message: r.message,
    status: r.status,
    reviewedAt: r.reviewedAt,
    createdAt: r.createdAt,
  };
}

export async function getTeamBySlug(slug: string, viewerUserId?: string | null): Promise<TeamDetail | null> {
  if (useMockData) {
    const team = mockTeams.find((t) => t.slug === slug);
    if (!team) {
      return null;
    }
    const members = mockTeamMemberRows(team.id);
    const teamProjects: TeamProjectCard[] = mockProjects
      .filter((p) => p.teamId === team.id)
      .map((p) => ({ slug: p.slug, title: p.title, oneLiner: p.oneLiner }));
    const detail: TeamDetail = {
      id: team.id,
      slug: team.slug,
      name: team.name,
      mission: team.mission,
      ownerUserId: team.ownerUserId,
      memberCount: members.length,
      projectCount: teamProjects.length,
      createdAt: team.createdAt,
      members,
      teamProjects,
    };
    if (viewerUserId) {
      const isMember = members.some((m) => m.userId === viewerUserId);
      if (!isMember) {
        const pend = mockTeamJoinRequests.find(
          (r) => r.teamId === team.id && r.applicantId === viewerUserId && r.status === "pending"
        );
        if (pend) {
          detail.viewerPendingJoinRequest = true;
        }
      }
      if (team.ownerUserId === viewerUserId) {
        detail.pendingJoinRequests = mockTeamJoinRequests
          .filter((r) => r.teamId === team.id && r.status === "pending")
          .map(toTeamJoinRequestRowMock);
      }
    }
    return detail;
  }

  const prisma = await getPrisma();
  const team = await prisma.team.findUnique({
    where: { slug },
    include: {
      _count: { select: { memberships: true, projects: true } },
      memberships: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
      },
      projects: {
        select: { slug: true, title: true, oneLiner: true },
        orderBy: { updatedAt: "desc" },
        take: 50,
      },
    },
  });

  if (!team) {
    return null;
  }

  const members = team.memberships
    .map((m) => ({
      userId: m.user.id,
      name: m.user.name,
      email: m.user.email,
      role: (m.role === "owner" ? "owner" : "member") as "owner" | "member",
      joinedAt: m.joinedAt.toISOString(),
    }))
    .sort((a, b) => {
      if (a.role === "owner") {
        return -1;
      }
      if (b.role === "owner") {
        return 1;
      }
      return a.joinedAt.localeCompare(b.joinedAt);
    });

  const detail: TeamDetail = {
    ...toTeamSummary(team, team._count.memberships, team._count.projects),
    members,
    teamProjects: team.projects.map((p) => ({
      slug: p.slug,
      title: p.title,
      oneLiner: p.oneLiner,
    })),
  };

  if (viewerUserId) {
    const isMember = members.some((m) => m.userId === viewerUserId);
    if (!isMember) {
      const pend = await prisma.teamJoinRequest.findFirst({
        where: { teamId: team.id, applicantId: viewerUserId, status: "pending" },
      });
      if (pend) {
        detail.viewerPendingJoinRequest = true;
      }
    }
    if (team.ownerUserId === viewerUserId) {
      const rows = await prisma.teamJoinRequest.findMany({
        where: { teamId: team.id, status: "pending" },
        include: { applicant: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      });
      detail.pendingJoinRequests = rows.map((r) => ({
        id: r.id,
        teamId: r.teamId,
        applicantId: r.applicant.id,
        applicantName: r.applicant.name,
        applicantEmail: r.applicant.email,
        message: r.message,
        status: r.status as TeamJoinRequestStatus,
        reviewedAt: r.reviewedAt?.toISOString(),
        createdAt: r.createdAt.toISOString(),
      }));
    }
  }

  return detail;
}

export async function createTeam(input: {
  ownerUserId: string;
  name: string;
  slug?: string;
  mission?: string;
}): Promise<TeamDetail> {
  const name = input.name.trim();
  if (!name) {
    throw new Error("INVALID_TEAM_NAME");
  }
  const baseSlug = slugifyTeamSlug(input.slug?.trim() || name);

  if (useMockData) {
    const ownerExists = mockUsers.some((u) => u.id === input.ownerUserId);
    if (!ownerExists) {
      throw new Error("USER_NOT_FOUND");
    }
    let slug = baseSlug;
    let n = 0;
    while (mockTeams.some((t) => t.slug === slug)) {
      n += 1;
      slug = `${baseSlug}-${n}`;
    }
    const id = `team_${Date.now()}`;
    const createdAt = new Date().toISOString();
    const team = {
      id,
      slug,
      name,
      mission: input.mission?.trim() || undefined,
      ownerUserId: input.ownerUserId,
      createdAt,
    };
    mockTeams.unshift(team);
    mockTeamMemberships.unshift({
      id: `tm_${Date.now()}`,
      teamId: id,
      userId: input.ownerUserId,
      role: "owner",
      joinedAt: createdAt,
    });
    mockAuditLogs.unshift({
      id: `log_team_${Date.now()}`,
      actorId: input.ownerUserId,
      action: "team_created",
      entityType: "team",
      entityId: id,
      metadata: { slug, name },
      createdAt,
    });
    const detail = await getTeamBySlug(slug);
    if (!detail) {
      throw new Error("TEAM_CREATE_FAILED");
    }
    return detail;
  }

  const prisma = await getPrisma();
  const owner = await prisma.user.findUnique({ where: { id: input.ownerUserId }, select: { id: true } });
  if (!owner) {
    throw new Error("USER_NOT_FOUND");
  }

  let slug = baseSlug;
  for (let i = 0; i < 20; i += 1) {
    const exists = await prisma.team.findUnique({ where: { slug }, select: { id: true } });
    if (!exists) {
      break;
    }
    slug = `${baseSlug}-${i + 1}`;
  }

  const created = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const team = await tx.team.create({
      data: {
        slug,
        name,
        mission: input.mission?.trim() || null,
        ownerUserId: input.ownerUserId,
        memberships: {
          create: { userId: input.ownerUserId, role: "owner" },
        },
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: input.ownerUserId,
        action: "team_created",
        entityType: "team",
        entityId: team.id,
        metadata: { slug: team.slug, name: team.name },
      },
    });
    return team;
  });

  const detail = await getTeamBySlug(created.slug);
  if (!detail) {
    throw new Error("TEAM_CREATE_FAILED");
  }
  return detail;
}

export async function requestTeamJoin(params: {
  teamSlug: string;
  userId: string;
  message?: string;
}): Promise<TeamJoinRequestRow> {
  const message = params.message?.trim().slice(0, 500) ?? "";

  if (useMockData) {
    const team = mockTeams.find((t) => t.slug === params.teamSlug);
    if (!team) {
      throw new Error("TEAM_NOT_FOUND");
    }
    if (team.ownerUserId === params.userId) {
      throw new Error("TEAM_OWNER_NO_REQUEST");
    }
    const userExists = mockUsers.some((u) => u.id === params.userId);
    if (!userExists) {
      throw new Error("USER_NOT_FOUND");
    }
    const existingMember = mockTeamMemberships.find((m) => m.teamId === team.id && m.userId === params.userId);
    if (existingMember) {
      throw new Error("TEAM_ALREADY_MEMBER");
    }
    const existingPending = mockTeamJoinRequests.find(
      (r) => r.teamId === team.id && r.applicantId === params.userId && r.status === "pending"
    );
    if (existingPending) {
      throw new Error("TEAM_JOIN_REQUEST_PENDING");
    }
    const rejectedIdx = mockTeamJoinRequests.findIndex(
      (r) => r.teamId === team.id && r.applicantId === params.userId && r.status === "rejected"
    );
    const createdAt = new Date().toISOString();
    if (rejectedIdx >= 0) {
      const prev = mockTeamJoinRequests[rejectedIdx];
      mockTeamJoinRequests[rejectedIdx] = {
        ...prev,
        message,
        status: "pending",
        reviewedAt: undefined,
        createdAt,
      };
      mockAuditLogs.unshift({
        id: `log_tjr_${Date.now()}`,
        actorId: params.userId,
        action: "team_join_requested",
        entityType: "team_join_request",
        entityId: prev.id,
        metadata: { teamId: team.id, teamSlug: team.slug, reopened: true },
        createdAt,
      });
      return toTeamJoinRequestRowMock(mockTeamJoinRequests[rejectedIdx]);
    }
    const row = {
      id: `tjr_${team.id}_${params.userId}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      teamId: team.id,
      applicantId: params.userId,
      message,
      status: "pending" as const,
      createdAt,
    };
    mockTeamJoinRequests.push(row);
    mockAuditLogs.unshift({
      id: `log_tjr_${Date.now()}`,
      actorId: params.userId,
      action: "team_join_requested",
      entityType: "team_join_request",
      entityId: row.id,
      metadata: { teamId: team.id, teamSlug: team.slug },
      createdAt,
    });
    return toTeamJoinRequestRowMock(row);
  }

  const prisma = await getPrisma();
  const team = await prisma.team.findUnique({
    where: { slug: params.teamSlug },
    select: { id: true, ownerUserId: true },
  });
  if (!team) {
    throw new Error("TEAM_NOT_FOUND");
  }
  if (team.ownerUserId === params.userId) {
    throw new Error("TEAM_OWNER_NO_REQUEST");
  }
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { id: true, name: true, email: true },
  });
  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  const existingMember = await prisma.teamMembership.findUnique({
    where: { teamId_userId: { teamId: team.id, userId: params.userId } },
  });
  if (existingMember) {
    throw new Error("TEAM_ALREADY_MEMBER");
  }

  const existingPending = await prisma.teamJoinRequest.findFirst({
    where: { teamId: team.id, applicantId: params.userId, status: "pending" },
  });
  if (existingPending) {
    throw new Error("TEAM_JOIN_REQUEST_PENDING");
  }

  const existingRejected = await prisma.teamJoinRequest.findFirst({
    where: { teamId: team.id, applicantId: params.userId, status: "rejected" },
  });

  try {
    const created = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const r = existingRejected
        ? await tx.teamJoinRequest.update({
            where: { id: existingRejected.id },
            data: {
              message,
              status: "pending",
              reviewedAt: null,
            },
            include: { applicant: { select: { id: true, name: true, email: true } } },
          })
        : await tx.teamJoinRequest.create({
            data: {
              teamId: team.id,
              applicantId: params.userId,
              message,
              status: "pending",
            },
            include: { applicant: { select: { id: true, name: true, email: true } } },
          });
      await tx.auditLog.create({
        data: {
          actorId: params.userId,
          action: "team_join_requested",
          entityType: "team_join_request",
          entityId: r.id,
          metadata: { teamId: team.id, reopened: Boolean(existingRejected) },
        },
      });
      return r;
    });
    return {
      id: created.id,
      teamId: created.teamId,
      applicantId: created.applicant.id,
      applicantName: created.applicant.name,
      applicantEmail: created.applicant.email,
      message: created.message,
      status: created.status as TeamJoinRequestStatus,
      reviewedAt: created.reviewedAt?.toISOString(),
      createdAt: created.createdAt.toISOString(),
    };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new Error("TEAM_JOIN_REQUEST_PENDING");
    }
    throw e;
  }
}

export async function reviewTeamJoinRequest(params: {
  teamSlug: string;
  requestId: string;
  ownerUserId: string;
  action: "approve" | "reject";
}): Promise<TeamJoinRequestRow> {
  if (useMockData) {
    const team = mockTeams.find((t) => t.slug === params.teamSlug);
    if (!team) {
      throw new Error("TEAM_NOT_FOUND");
    }
    if (team.ownerUserId !== params.ownerUserId) {
      throw new Error("FORBIDDEN_NOT_OWNER");
    }
    const idx = mockTeamJoinRequests.findIndex((r) => r.id === params.requestId && r.teamId === team.id);
    if (idx < 0) {
      throw new Error("JOIN_REQUEST_NOT_FOUND");
    }
    const req = mockTeamJoinRequests[idx];
    if (req.status !== "pending") {
      throw new Error("JOIN_REQUEST_NOT_PENDING");
    }
    const reviewedAt = new Date().toISOString();
    if (params.action === "reject") {
      mockTeamJoinRequests[idx] = { ...req, status: "rejected", reviewedAt };
      return toTeamJoinRequestRowMock(mockTeamJoinRequests[idx]);
    }
    const existingMember = mockTeamMemberships.find((m) => m.teamId === team.id && m.userId === req.applicantId);
    if (existingMember) {
      throw new Error("TEAM_ALREADY_MEMBER");
    }
    mockTeamJoinRequests[idx] = { ...req, status: "approved", reviewedAt };
    mockTeamMemberships.push({
      id: `tm_${Date.now()}`,
      teamId: team.id,
      userId: req.applicantId,
      role: "member",
      joinedAt: reviewedAt,
    });
    mockAuditLogs.unshift({
      id: `log_tjr_review_${Date.now()}`,
      actorId: params.ownerUserId,
      action: "team_join_approved",
      entityType: "team_join_request",
      entityId: req.id,
      metadata: { teamId: team.id, applicantId: req.applicantId },
      createdAt: reviewedAt,
    });
    return toTeamJoinRequestRowMock(mockTeamJoinRequests[idx]);
  }

  const prisma = await getPrisma();
  const team = await prisma.team.findUnique({
    where: { slug: params.teamSlug },
    select: { id: true, ownerUserId: true },
  });
  if (!team) {
    throw new Error("TEAM_NOT_FOUND");
  }
  if (team.ownerUserId !== params.ownerUserId) {
    throw new Error("FORBIDDEN_NOT_OWNER");
  }

  const req = await prisma.teamJoinRequest.findFirst({
    where: { id: params.requestId, teamId: team.id },
    include: { applicant: { select: { id: true, name: true, email: true } } },
  });
  if (!req) {
    throw new Error("JOIN_REQUEST_NOT_FOUND");
  }
  if (req.status !== "pending") {
    throw new Error("JOIN_REQUEST_NOT_PENDING");
  }

  if (params.action === "reject") {
    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const r = await tx.teamJoinRequest.update({
        where: { id: req.id },
        data: { status: "rejected", reviewedAt: new Date() },
        include: { applicant: { select: { id: true, name: true, email: true } } },
      });
      await tx.auditLog.create({
        data: {
          actorId: params.ownerUserId,
          action: "team_join_rejected",
          entityType: "team_join_request",
          entityId: r.id,
          metadata: { teamId: team.id, applicantId: r.applicantId },
        },
      });
      return r;
    });
    return {
      id: updated.id,
      teamId: updated.teamId,
      applicantId: updated.applicant.id,
      applicantName: updated.applicant.name,
      applicantEmail: updated.applicant.email,
      message: updated.message,
      status: updated.status as TeamJoinRequestStatus,
      reviewedAt: updated.reviewedAt?.toISOString(),
      createdAt: updated.createdAt.toISOString(),
    };
  }

  const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const r = await tx.teamJoinRequest.update({
      where: { id: req.id },
      data: { status: "approved", reviewedAt: new Date() },
      include: { applicant: { select: { id: true, name: true, email: true } } },
    });
    await tx.teamMembership.upsert({
      where: { teamId_userId: { teamId: team.id, userId: r.applicantId } },
      update: {},
      create: { teamId: team.id, userId: r.applicantId, role: "member" },
    });
    await tx.auditLog.create({
      data: {
        actorId: params.ownerUserId,
        action: "team_join_approved",
        entityType: "team_join_request",
        entityId: r.id,
        metadata: { teamId: team.id, applicantId: r.applicantId },
      },
    });
    return r;
  });

  return {
    id: updated.id,
    teamId: updated.teamId,
    applicantId: updated.applicant.id,
    applicantName: updated.applicant.name,
    applicantEmail: updated.applicant.email,
    message: updated.message,
    status: updated.status as TeamJoinRequestStatus,
    reviewedAt: updated.reviewedAt?.toISOString(),
    createdAt: updated.createdAt.toISOString(),
  };
}

export async function addTeamMemberByEmail(params: {
  teamSlug: string;
  actorUserId: string;
  email: string;
}): Promise<TeamMember> {
  const email = params.email.trim().toLowerCase();
  if (!email) {
    throw new Error("INVALID_EMAIL");
  }

  if (useMockData) {
    const team = mockTeams.find((t) => t.slug === params.teamSlug);
    if (!team) {
      throw new Error("TEAM_NOT_FOUND");
    }
    if (team.ownerUserId !== params.actorUserId) {
      throw new Error("FORBIDDEN_NOT_OWNER");
    }
    const target = mockUsers.find((u) => u.email.toLowerCase() === email);
    if (!target) {
      throw new Error("USER_NOT_FOUND");
    }
    const existing = mockTeamMemberships.find((m) => m.teamId === team.id && m.userId === target.id);
    if (existing) {
      throw new Error("TEAM_ALREADY_MEMBER");
    }
    const joinedAt = new Date().toISOString();
    mockTeamMemberships.push({
      id: `tm_${Date.now()}`,
      teamId: team.id,
      userId: target.id,
      role: "member",
      joinedAt,
    });
    const now = joinedAt;
    for (let i = 0; i < mockTeamJoinRequests.length; i += 1) {
      const jr = mockTeamJoinRequests[i];
      if (jr.teamId === team.id && jr.applicantId === target.id && jr.status === "pending") {
        mockTeamJoinRequests[i] = { ...jr, status: "approved", reviewedAt: now };
      }
    }
    return { userId: target.id, name: target.name, email: target.email, role: "member", joinedAt };
  }

  const prisma = await getPrisma();
  const team = await prisma.team.findUnique({
    where: { slug: params.teamSlug },
    select: { id: true, ownerUserId: true },
  });
  if (!team) {
    throw new Error("TEAM_NOT_FOUND");
  }
  if (team.ownerUserId !== params.actorUserId) {
    throw new Error("FORBIDDEN_NOT_OWNER");
  }
  const target = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, email: true } });
  if (!target) {
    throw new Error("USER_NOT_FOUND");
  }

  try {
    const row = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const m = await tx.teamMembership.create({
        data: { teamId: team.id, userId: target.id, role: "member" },
        include: { user: { select: { id: true, name: true, email: true } } },
      });
      await tx.teamJoinRequest.updateMany({
        where: { teamId: team.id, applicantId: target.id, status: "pending" },
        data: { status: "approved", reviewedAt: new Date() },
      });
      return m;
    });
    return {
      userId: row.user.id,
      name: row.user.name,
      email: row.user.email,
      role: "member",
      joinedAt: row.joinedAt.toISOString(),
    };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new Error("TEAM_ALREADY_MEMBER");
    }
    throw e;
  }
}

export async function removeTeamMember(params: {
  teamSlug: string;
  actorUserId: string;
  memberUserId: string;
}): Promise<void> {
  if (useMockData) {
    const team = mockTeams.find((t) => t.slug === params.teamSlug);
    if (!team) {
      throw new Error("TEAM_NOT_FOUND");
    }
    const membership = mockTeamMemberships.find(
      (m) => m.teamId === team.id && m.userId === params.memberUserId
    );
    if (!membership) {
      throw new Error("MEMBERSHIP_NOT_FOUND");
    }
    if (membership.role === "owner") {
      throw new Error("CANNOT_REMOVE_OWNER");
    }
    const isOwner = team.ownerUserId === params.actorUserId;
    const isSelf = params.actorUserId === params.memberUserId;
    if (!isOwner && !isSelf) {
      throw new Error("FORBIDDEN");
    }
    const idx = mockTeamMemberships.findIndex(
      (m) => m.teamId === team.id && m.userId === params.memberUserId
    );
    if (idx >= 0) {
      mockTeamMemberships.splice(idx, 1);
    }
    return;
  }

  const prisma = await getPrisma();
  const team = await prisma.team.findUnique({
    where: { slug: params.teamSlug },
    select: { id: true, ownerUserId: true },
  });
  if (!team) {
    throw new Error("TEAM_NOT_FOUND");
  }

  const membership = await prisma.teamMembership.findUnique({
    where: { teamId_userId: { teamId: team.id, userId: params.memberUserId } },
    select: { role: true },
  });
  if (!membership) {
    throw new Error("MEMBERSHIP_NOT_FOUND");
  }
  if (membership.role === "owner") {
    throw new Error("CANNOT_REMOVE_OWNER");
  }

  const isOwner = team.ownerUserId === params.actorUserId;
  const isSelf = params.actorUserId === params.memberUserId;
  if (!isOwner && !isSelf) {
    throw new Error("FORBIDDEN");
  }

  await prisma.teamMembership.delete({
    where: { teamId_userId: { teamId: team.id, userId: params.memberUserId } },
  });
}

export function getDemoUser(role: DemoRole = "user") {
  const fallbackUser = mockUsers.find((item) => item.role === "user");
  const user =
    (role === "admin"
      ? mockUsers.find((item) => item.role === "admin")
      : mockUsers.find((item) => item.role === "user")) ?? fallbackUser;

  if (!user) {
    throw new Error("Demo user is not configured");
  }

  return {
    userId: user.id,
    role: user.role,
    name: user.name,
  };
}
