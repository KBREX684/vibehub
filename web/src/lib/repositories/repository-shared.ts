import { isMockDataEnabled } from "@/lib/runtime-mode";
import type {
  TeamJoinRequestRow,
  TeamJoinRequestStatus,
  TeamSummary,
} from "@/lib/types";

export const useMockData = isMockDataEnabled();

export async function getPrisma() {
  const db = await import("@/lib/db");
  return db.prisma;
}

export function toTeamJoinRequestRow(r: {
  id: string;
  teamId: string;
  applicantId: string;
  applicantName: string;
  applicantEmail: string;
  message: string;
  status: TeamJoinRequestStatus;
  reviewedAt?: string;
  createdAt: string;
}): TeamJoinRequestRow {
  return {
    id: r.id,
    teamId: r.teamId,
    applicantId: r.applicantId,
    applicantName: r.applicantName,
    applicantEmail: r.applicantEmail,
    message: r.message,
    status: r.status,
    reviewedAt: r.reviewedAt,
    createdAt: r.createdAt,
  };
}


export async function listTeamsForUser(params: {
  useMockData: boolean;
  getPrisma: () => Promise<{
    team: {
      findMany: (input: {
        where: { memberships: { some: { userId: string } } };
        orderBy: { createdAt: "desc" };
        include: { _count: { select: { memberships: true; projects: true } } };
      }) => Promise<Array<{
        id: string;
        slug: string;
        name: string;
        mission: string | null;
        ownerUserId: string;
        _count: { memberships: number; projects: number };
        createdAt: Date;
      }>>;
    };
  }>;
  userId: string;
  mockTeamMemberships: Array<{ teamId: string; userId: string }>;
  mockTeams: Array<{
    id: string;
    slug: string;
    name: string;
    mission?: string;
    ownerUserId: string;
    createdAt: string;
  }>;
  mockProjects: Array<{ teamId?: string }>;
}): Promise<TeamSummary[]> {
  if (params.useMockData) {
    const teamIds = new Set(
      params.mockTeamMemberships.filter((m) => m.userId === params.userId).map((m) => m.teamId)
    );
    return params.mockTeams
      .filter((t) => teamIds.has(t.id))
      .map((t) => ({
        id: t.id,
        slug: t.slug,
        name: t.name,
        mission: t.mission,
        ownerUserId: t.ownerUserId,
        memberCount: params.mockTeamMemberships.filter((m) => m.teamId === t.id).length,
        projectCount: params.mockProjects.filter((p) => p.teamId === t.id).length,
        createdAt: t.createdAt,
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  const prisma = await params.getPrisma();
  const rows = await prisma.team.findMany({
    where: { memberships: { some: { userId: params.userId } } },
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

export async function listPendingJoinRequestsForOwner(params: {
  useMockData: boolean;
  getPrisma: () => Promise<{
    teamJoinRequest: {
      findMany: (input: {
        where: { status: "pending"; team: { ownerUserId: string } };
        include: {
          team: { select: { slug: true; name: true } };
          applicant: { select: { id: true; name: true; email: true } };
        };
        orderBy: { createdAt: "desc" };
      }) => Promise<Array<{
        id: string;
        teamId: string;
        message: string;
        status: string;
        reviewedAt: Date | null;
        createdAt: Date;
        team: { slug: string; name: string };
        applicant: { id: string; name: string; email: string };
      }>>;
    };
  }>;
  ownerUserId: string;
  mockTeams: Array<{ id: string; slug: string; name: string; ownerUserId: string }>;
  mockTeamJoinRequests: Array<{
    id: string;
    teamId: string;
    applicantId: string;
    message: string;
    status: TeamJoinRequestStatus;
    reviewedAt?: string;
    createdAt: string;
  }>;
  mockUsers: Array<{ id: string; name: string; email: string }>;
}): Promise<Array<TeamJoinRequestRow & { teamSlug: string; teamName: string }>> {
  if (params.useMockData) {
    const owned = params.mockTeams.filter((t) => t.ownerUserId === params.ownerUserId);
    const out: Array<TeamJoinRequestRow & { teamSlug: string; teamName: string }> = [];
    for (const team of owned) {
      for (const request of params.mockTeamJoinRequests) {
        if (request.teamId === team.id && request.status === "pending") {
          const applicant = params.mockUsers.find((user) => user.id === request.applicantId);
          out.push({
            ...toTeamJoinRequestRow({
              id: request.id,
              teamId: request.teamId,
              applicantId: request.applicantId,
              applicantName: applicant?.name ?? "Unknown",
              applicantEmail: applicant?.email ?? "",
              message: request.message,
              status: request.status,
              reviewedAt: request.reviewedAt,
              createdAt: request.createdAt,
            }),
            teamSlug: team.slug,
            teamName: team.name,
          });
        }
      }
    }
    return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  const prisma = await params.getPrisma();
  const rows = await prisma.teamJoinRequest.findMany({
    where: { status: "pending", team: { ownerUserId: params.ownerUserId } },
    include: {
      team: { select: { slug: true, name: true } },
      applicant: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    teamId: r.teamId,
    applicantId: r.applicant.id,
    applicantName: r.applicant.name,
    applicantEmail: r.applicant.email,
    message: r.message,
    status: r.status as TeamJoinRequestStatus,
    reviewedAt: r.reviewedAt?.toISOString(),
    createdAt: r.createdAt.toISOString(),
    teamSlug: r.team.slug,
    teamName: r.team.name,
  }));
}
