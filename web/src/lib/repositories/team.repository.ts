import { Prisma } from "@prisma/client";
import { paginateArray } from "@/lib/pagination";
import { isMockDataEnabled } from "@/lib/runtime-mode";
import {
  mockAuditLogs,
  mockProjects,
  mockTeamJoinRequests,
  mockTeamMemberships,
  mockTeams,
  mockUsers,
} from "@/lib/data/mock-data";
import { ensureTeamWorkspace } from "@/lib/repositories/workspace.repository";
import { assertV11LegacyWriteAllowed } from "@/lib/repository-errors";
import { isV11BackendLockdownEnabled } from "@/lib/v11-deprecation";
import type {
  TeamDetail,
  TeamJoinRequestRow,
  TeamJoinRequestStatus,
  TeamMember,
  TeamProjectCard,
  TeamSummary,
} from "@/lib/types";

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

const TEAM_SLUG_MAX_LENGTH = 48;
const useMockData = isMockDataEnabled();

async function getPrisma() {
  const db = await import("@/lib/db");
  return db.prisma;
}

function slugifyTeamSlug(raw: string): string {
  const s = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, TEAM_SLUG_MAX_LENGTH);
  return s || "team";
}

function buildTeamSlugCandidate(baseSlug: string, duplicateIndex: number): string {
  if (duplicateIndex <= 0) return baseSlug.slice(0, TEAM_SLUG_MAX_LENGTH) || "team";
  const suffix = `-${duplicateIndex}`;
  const baseLimit = TEAM_SLUG_MAX_LENGTH - suffix.length;
  if (baseLimit <= 0) return `${duplicateIndex}`.slice(-TEAM_SLUG_MAX_LENGTH);
  const normalizedBase = baseSlug.slice(0, baseLimit).replace(/-+$/g, "") || "team";
  return `${normalizedBase}${suffix}`;
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
      const rank = (role: TeamMember["role"]) =>
        role === "owner" ? 0 : role === "admin" ? 1 : role === "reviewer" ? 2 : 3;
      const diff = rank(a.role) - rank(b.role);
      if (diff !== 0) return diff;
      return a.joinedAt.localeCompare(b.joinedAt);
    });
}

function toTeamSummary(
  team: {
    id: string;
    slug: string;
    name: string;
    mission: string | null;
    ownerUserId: string;
    discordUrl?: string | null;
    telegramUrl?: string | null;
    slackUrl?: string | null;
    githubOrgUrl?: string | null;
    githubRepoUrl?: string | null;
    createdAt: Date;
  },
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
    discordUrl: team.discordUrl ?? undefined,
    telegramUrl: team.telegramUrl ?? undefined,
    slackUrl: team.slackUrl ?? undefined,
    githubOrgUrl: team.githubOrgUrl ?? undefined,
    githubRepoUrl: team.githubRepoUrl ?? undefined,
    createdAt: team.createdAt.toISOString(),
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

export async function listTeams(params: {
  page: number;
  limit: number;
}): Promise<Paginated<TeamSummary>> {
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
        discordUrl: t.discordUrl,
        telegramUrl: t.telegramUrl,
        slackUrl: t.slackUrl,
        githubOrgUrl: t.githubOrgUrl,
        githubRepoUrl: t.githubRepoUrl,
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

export async function getTeamBySlug(
  slug: string,
  viewerUserId?: string | null
): Promise<TeamDetail | null> {
  if (useMockData) {
    const team = mockTeams.find((t) => t.slug === slug);
    if (!team) return null;
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
      discordUrl: team.discordUrl,
      telegramUrl: team.telegramUrl,
      slackUrl: team.slackUrl,
      githubOrgUrl: team.githubOrgUrl,
      githubRepoUrl: team.githubRepoUrl,
      createdAt: team.createdAt,
      members,
      teamProjects,
    };
    if (viewerUserId) {
      const viewerMembership = members.find((m) => m.userId === viewerUserId);
      const isMember = Boolean(viewerMembership);
      if (viewerMembership) detail.viewerRole = viewerMembership.role;
      if (!isMember) {
        const pend = mockTeamJoinRequests.find(
          (r) => r.teamId === team.id && r.applicantId === viewerUserId && r.status === "pending"
        );
        if (pend) detail.viewerPendingJoinRequest = true;
      }
      if (viewerMembership?.role === "owner" || viewerMembership?.role === "admin") {
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
  if (!team) return null;

  const members = team.memberships
    .map((m) => ({
      userId: m.user.id,
      name: m.user.name,
      email: m.user.email,
      role: m.role as TeamMember["role"],
      joinedAt: m.joinedAt.toISOString(),
    }))
    .sort((a, b) => {
      const rank = (role: TeamMember["role"]) =>
        role === "owner" ? 0 : role === "admin" ? 1 : role === "reviewer" ? 2 : 3;
      const diff = rank(a.role) - rank(b.role);
      if (diff !== 0) return diff;
      return a.joinedAt.localeCompare(b.joinedAt);
    });

  const detail: TeamDetail = {
    ...toTeamSummary(team, team._count.memberships, team._count.projects),
    members,
    teamProjects: team.projects.map((p) => ({ slug: p.slug, title: p.title, oneLiner: p.oneLiner })),
  };

  if (viewerUserId) {
    const viewerMembership = members.find((m) => m.userId === viewerUserId);
    const isMember = Boolean(viewerMembership);
    if (viewerMembership) detail.viewerRole = viewerMembership.role;
    if (!isMember) {
      const pend = await prisma.teamJoinRequest.findFirst({
        where: { teamId: team.id, applicantId: viewerUserId, status: "pending" },
      });
      if (pend) detail.viewerPendingJoinRequest = true;
    }
    if (viewerMembership?.role === "owner" || viewerMembership?.role === "admin") {
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

export async function updateTeamProfile(params: {
  teamSlug: string;
  actorUserId: string;
  name?: string;
  mission?: string | null;
}): Promise<TeamDetail> {
  const nextName = params.name?.trim();
  const nextMission = params.mission === undefined ? undefined : (params.mission?.trim() ?? "");

  if (nextName !== undefined && nextName.length < 2) {
    throw new Error("INVALID_TEAM_NAME");
  }
  if (nextName !== undefined && nextName.length > 80) {
    throw new Error("INVALID_TEAM_NAME");
  }
  if (nextMission !== undefined && nextMission.length > 500) {
    throw new Error("INVALID_TEAM_MISSION");
  }

  if (useMockData) {
    const team = mockTeams.find((t) => t.slug === params.teamSlug);
    if (!team) throw new Error("TEAM_NOT_FOUND");
    const membership = mockTeamMemberships.find((m) => m.teamId === team.id && m.userId === params.actorUserId);
    if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
      throw new Error("FORBIDDEN_NOT_OWNER");
    }
    if (nextName !== undefined) team.name = nextName;
    if (nextMission !== undefined) team.mission = nextMission || undefined;
    const detail = await getTeamBySlug(params.teamSlug, params.actorUserId);
    if (!detail) throw new Error("TEAM_NOT_FOUND");
    return detail;
  }

  const prisma = await getPrisma();
  const team = await prisma.team.findUnique({ where: { slug: params.teamSlug }, select: { id: true } });
  if (!team) throw new Error("TEAM_NOT_FOUND");
  const membership = await prisma.teamMembership.findUnique({
    where: { teamId_userId: { teamId: team.id, userId: params.actorUserId } },
    select: { role: true },
  });
  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    throw new Error("FORBIDDEN_NOT_OWNER");
  }

  const data: Record<string, string | null> = {};
  if (nextName !== undefined) data.name = nextName;
  if (nextMission !== undefined) data.mission = nextMission || null;

  if (Object.keys(data).length === 0) {
    const detail = await getTeamBySlug(params.teamSlug, params.actorUserId);
    if (!detail) throw new Error("TEAM_NOT_FOUND");
    return detail;
  }

  await prisma.team.update({ where: { id: team.id }, data });
  const detail = await getTeamBySlug(params.teamSlug, params.actorUserId);
  if (!detail) throw new Error("TEAM_NOT_FOUND");
  return detail;
}

export async function createTeam(input: {
  ownerUserId: string;
  name: string;
  slug?: string;
  mission?: string;
}): Promise<TeamDetail> {
  if (isV11BackendLockdownEnabled()) {
    assertV11LegacyWriteAllowed("TEAMS_DEPRECATED");
  }
  const name = input.name.trim();
  if (!name) throw new Error("INVALID_TEAM_NAME");
  const baseSlug = slugifyTeamSlug(input.slug?.trim() || name);

  if (useMockData) {
    const ownerExists = mockUsers.some((u) => u.id === input.ownerUserId);
    if (!ownerExists) throw new Error("USER_NOT_FOUND");
    let n = 0;
    let slug = buildTeamSlugCandidate(baseSlug, n);
    while (mockTeams.some((t) => t.slug === slug)) {
      n += 1;
      slug = buildTeamSlugCandidate(baseSlug, n);
    }
    const id = `team_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
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
      id: `tm_${id}_${input.ownerUserId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
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
    void ensureTeamWorkspace(id).catch(() => undefined);
    const detail = await getTeamBySlug(slug);
    if (!detail) throw new Error("TEAM_CREATE_FAILED");
    return detail;
  }

  const prisma = await getPrisma();
  const owner = await prisma.user.findUnique({ where: { id: input.ownerUserId }, select: { id: true } });
  if (!owner) throw new Error("USER_NOT_FOUND");

  let n = 0;
  let slug = buildTeamSlugCandidate(baseSlug, n);
  for (let i = 0; i < 20; i += 1) {
    const exists = await prisma.team.findUnique({ where: { slug }, select: { id: true } });
    if (!exists) break;
    n += 1;
    slug = buildTeamSlugCandidate(baseSlug, n);
  }

  const created = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const team = await tx.team.create({
      data: {
        slug,
        name,
        mission: input.mission?.trim() || null,
        ownerUserId: input.ownerUserId,
        memberships: { create: { userId: input.ownerUserId, role: "owner" } },
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
    await ensureTeamWorkspace(team.id, tx, {
      id: team.id,
      slug: team.slug,
      name: team.name,
      mission: team.mission,
    });
    return team;
  });

  const detail = await getTeamBySlug(created.slug);
  if (!detail) throw new Error("TEAM_CREATE_FAILED");
  return detail;
}
