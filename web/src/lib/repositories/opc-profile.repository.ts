import { randomUUID } from "crypto";
import type {
  OpcProfile,
  OpcTrustMetric,
  PersonalWorkspaceMetrics,
  TrustCard,
} from "@/lib/types";
import {
  mockCollaborationIntents,
  mockCreators,
  mockLegalAttestationLinks,
  mockLedgerEntries,
  mockOpcProfiles,
  mockOpcTrustMetrics,
  mockProjects,
  mockUsers,
  mockWorkspaceArtifacts,
  mockWorkspaceSnapshots,
} from "@/lib/data/mock-data";
import { RepositoryError } from "@/lib/repository-errors";
import { getPrisma, useMockData } from "@/lib/repositories/repository-shared";
import { ensurePersonalWorkspace } from "@/lib/repositories/workspace.repository";

function monthBounds(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  return { start, end };
}

function toOpcProfileDto(row: {
  id: string;
  userId: string;
  headline?: string | null;
  summary?: string | null;
  serviceScope?: string | null;
  city?: string | null;
  websiteUrl?: string | null;
  proofUrl?: string | null;
  publicCard: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}): OpcProfile {
  return {
    id: row.id,
    userId: row.userId,
    headline: row.headline ?? undefined,
    summary: row.summary ?? undefined,
    serviceScope: row.serviceScope ?? undefined,
    city: row.city ?? undefined,
    websiteUrl: row.websiteUrl ?? undefined,
    proofUrl: row.proofUrl ?? undefined,
    publicCard: row.publicCard,
    createdAt: typeof row.createdAt === "string" ? row.createdAt : row.createdAt.toISOString(),
    updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : row.updatedAt.toISOString(),
  };
}

function toOpcTrustMetricDto(row: {
  id: string;
  userId: string;
  ledgerEntryCount: number;
  snapshotCount: number;
  stampedArtifactCount: number;
  publicWorkCount: number;
  avgResponseHours: number;
  registrationDays: number;
  updatedAt: string | Date;
}): OpcTrustMetric {
  return {
    id: row.id,
    userId: row.userId,
    ledgerEntryCount: row.ledgerEntryCount,
    snapshotCount: row.snapshotCount,
    stampedArtifactCount: row.stampedArtifactCount,
    publicWorkCount: row.publicWorkCount,
    avgResponseHours: row.avgResponseHours,
    registrationDays: row.registrationDays,
    updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : row.updatedAt.toISOString(),
  };
}

export async function computePersonalWorkspaceMetrics(userId: string): Promise<PersonalWorkspaceMetrics> {
  const workspace = await ensurePersonalWorkspace(userId);
  const { start, end } = monthBounds();

  if (useMockData) {
    const monthlyLedgerCount = mockLedgerEntries.filter((item) => {
      if (item.workspaceId !== workspace.id) return false;
      const signedAt = new Date(item.signedAt);
      return signedAt >= start && signedAt < end;
    }).length;
    const createdArtifacts = mockWorkspaceArtifacts.filter((item) => {
      if (item.workspaceId !== workspace.id) return false;
      const createdAt = new Date(item.createdAt);
      return createdAt >= start && createdAt < end;
    });
    const stampedArtifacts = createdArtifacts.filter((item) => Boolean(item.aigcStampId));
    return {
      monthlyLedgerCount,
      aigcStampCoveragePct:
        createdArtifacts.length === 0 ? 100 : Math.round((stampedArtifacts.length / createdArtifacts.length) * 100),
    };
  }

  const db = await getPrisma();
  const [monthlyLedgerCount, artifactAggregates] = await Promise.all([
    db.ledgerEntry.count({
      where: {
        workspaceId: workspace.id,
        signedAt: { gte: start, lt: end },
      },
    }),
    db.workspaceArtifact.aggregate({
      where: {
        workspaceId: workspace.id,
        createdAt: { gte: start, lt: end },
      },
      _count: { _all: true, aigcStampId: true },
    }),
  ]);

  const totalArtifacts = artifactAggregates._count._all;
  const stampedArtifacts = artifactAggregates._count.aigcStampId;
  return {
    monthlyLedgerCount,
    aigcStampCoveragePct:
      totalArtifacts === 0 ? 100 : Math.round((stampedArtifacts / totalArtifacts) * 100),
  };
}

async function ensureMockOpcProfile(userId: string): Promise<OpcProfile> {
  const existing = mockOpcProfiles.find((item) => item.userId === userId);
  if (existing) return existing;
  const creator = mockCreators.find((item) => item.userId === userId);
  const now = new Date().toISOString();
  const created = toOpcProfileDto({
    id: randomUUID(),
    userId,
    headline: creator?.headline,
    summary: creator?.bio,
    websiteUrl: creator?.websiteUrl,
    publicCard: true,
    createdAt: now,
    updatedAt: now,
  });
  mockOpcProfiles.push(created);
  return created;
}

async function ensureDbOpcProfile(userId: string): Promise<OpcProfile> {
  const db = await getPrisma();
  const creator = await db.creatorProfile.findUnique({
    where: { userId },
    select: { headline: true, bio: true, websiteUrl: true },
  });
  const row = await db.opcProfile.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      headline: creator?.headline,
      summary: creator?.bio,
      websiteUrl: creator?.websiteUrl,
      publicCard: true,
    },
  });
  return toOpcProfileDto(row);
}

export async function getOrCreateOpcProfile(userId: string): Promise<OpcProfile> {
  return useMockData ? ensureMockOpcProfile(userId) : ensureDbOpcProfile(userId);
}

export async function updateOpcProfile(params: {
  userId: string;
  headline?: string;
  summary?: string;
  serviceScope?: string;
  city?: string;
  websiteUrl?: string;
  proofUrl?: string;
  publicCard?: boolean;
}): Promise<OpcProfile> {
  const current = await getOrCreateOpcProfile(params.userId);
  if (useMockData) {
    current.headline = params.headline ?? current.headline;
    current.summary = params.summary ?? current.summary;
    current.serviceScope = params.serviceScope ?? current.serviceScope;
    current.city = params.city ?? current.city;
    current.websiteUrl = params.websiteUrl ?? current.websiteUrl;
    current.proofUrl = params.proofUrl ?? current.proofUrl;
    current.publicCard = params.publicCard ?? current.publicCard;
    current.updatedAt = new Date().toISOString();
    return current;
  }

  const db = await getPrisma();
  const row = await db.opcProfile.update({
    where: { userId: params.userId },
    data: {
      ...(params.headline !== undefined ? { headline: params.headline } : {}),
      ...(params.summary !== undefined ? { summary: params.summary } : {}),
      ...(params.serviceScope !== undefined ? { serviceScope: params.serviceScope } : {}),
      ...(params.city !== undefined ? { city: params.city } : {}),
      ...(params.websiteUrl !== undefined ? { websiteUrl: params.websiteUrl } : {}),
      ...(params.proofUrl !== undefined ? { proofUrl: params.proofUrl } : {}),
      ...(params.publicCard !== undefined ? { publicCard: params.publicCard } : {}),
    },
  });
  return toOpcProfileDto(row);
}

export async function recomputeOpcTrustMetric(userId: string): Promise<OpcTrustMetric> {
  if (useMockData) {
    const user = mockUsers.find((item) => item.id === userId);
    if (!user) throw new RepositoryError("NOT_FOUND", "User not found", 404);
    const creator = mockCreators.find((item) => item.userId === userId);
    const projectIds = new Set(mockProjects.filter((item) => creator && item.creatorId === creator.id).map((item) => item.id));
    const reviewed = mockCollaborationIntents.filter((item) => projectIds.has(item.projectId) && item.reviewedAt);
    const avgResponseHours = reviewed.length
      ? reviewed.reduce((sum, item) => {
          const reviewedAt = new Date(item.reviewedAt as string).getTime();
          const createdAt = new Date(item.createdAt).getTime();
          return sum + Math.max(0, (reviewedAt - createdAt) / 36e5);
        }, 0) / reviewed.length
      : 0;
    const next = toOpcTrustMetricDto({
      id: mockOpcTrustMetrics.find((item) => item.userId === userId)?.id ?? randomUUID(),
      userId,
      ledgerEntryCount: mockLedgerEntries.filter((item) => item.actorType === "user" && item.actorId === userId).length,
      snapshotCount: mockWorkspaceSnapshots.filter((item) => item.createdByUserId === userId).length,
      stampedArtifactCount: mockWorkspaceArtifacts.filter((item) => item.uploaderUserId === userId && item.aigcStampId).length,
      publicWorkCount: projectIds.size,
      avgResponseHours: Number(avgResponseHours.toFixed(2)),
      registrationDays: user.createdAt
        ? Math.max(0, Math.floor((Date.now() - new Date(user.createdAt).getTime()) / 86400000))
        : 0,
      updatedAt: new Date().toISOString(),
    });
    const existing = mockOpcTrustMetrics.find((item) => item.userId === userId);
    if (existing) {
      Object.assign(existing, next);
      return existing;
    }
    mockOpcTrustMetrics.push(next);
    return next;
  }

  const db = await getPrisma();
  const [user, ledgerEntryCount, snapshotCount, stampedArtifactCount, publicWorkCount, responseRows] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { createdAt: true } }),
    db.ledgerEntry.count({ where: { actorType: "user", actorId: userId } }),
    db.snapshotCapsule.count({ where: { createdByUserId: userId } }),
    db.workspaceArtifact.count({ where: { uploaderUserId: userId, aigcStampId: { not: null } } }),
    db.project.count({ where: { creator: { userId } } }),
    db.collaborationIntent.findMany({
      where: {
        reviewedAt: { not: null },
        project: { creator: { userId } },
      },
      select: {
        createdAt: true,
        reviewedAt: true,
      },
      take: 500,
    }),
  ]);
  if (!user) throw new RepositoryError("NOT_FOUND", "User not found", 404);

  const avgResponseHours = responseRows.length
    ? responseRows.reduce((sum, row) => {
        const reviewedAt = row.reviewedAt?.getTime() ?? row.createdAt.getTime();
        const createdAt = row.createdAt.getTime();
        return sum + Math.max(0, (reviewedAt - createdAt) / 36e5);
      }, 0) / responseRows.length
    : 0;

  const row = await db.opcTrustMetric.upsert({
    where: { userId },
    update: {
      ledgerEntryCount,
      snapshotCount,
      stampedArtifactCount,
      publicWorkCount,
      avgResponseHours: Number(avgResponseHours.toFixed(2)),
      registrationDays: Math.max(0, Math.floor((Date.now() - user.createdAt.getTime()) / 86400000)),
    },
    create: {
      userId,
      ledgerEntryCount,
      snapshotCount,
      stampedArtifactCount,
      publicWorkCount,
      avgResponseHours: Number(avgResponseHours.toFixed(2)),
      registrationDays: Math.max(0, Math.floor((Date.now() - user.createdAt.getTime()) / 86400000)),
    },
  });
  return toOpcTrustMetricDto(row);
}

export async function getOpcTrustMetric(userId: string): Promise<OpcTrustMetric> {
  if (useMockData) {
    const existing = mockOpcTrustMetrics.find((item) => item.userId === userId);
    if (existing) return existing;
    return recomputeOpcTrustMetric(userId);
  }

  const db = await getPrisma();
  const existing = await db.opcTrustMetric.findUnique({ where: { userId } });
  if (existing) {
    return toOpcTrustMetricDto(existing);
  }
  return recomputeOpcTrustMetric(userId);
}

export async function getPersonalWorkspaceOverview(userId: string): Promise<{
  workspaceId: string;
  title: string;
  metrics: PersonalWorkspaceMetrics;
}> {
  const workspace = await ensurePersonalWorkspace(userId);
  const metrics = await computePersonalWorkspaceMetrics(userId);
  return {
    workspaceId: workspace.id,
    title: workspace.title,
    metrics,
  };
}

export async function getPublicTrustCardBySlug(slug: string): Promise<TrustCard> {
  if (useMockData) {
    const creator = mockCreators.find((item) => item.slug === slug);
    if (!creator) throw new RepositoryError("NOT_FOUND", "Trust card not found", 404);
    const user = mockUsers.find((item) => item.id === creator.userId);
    if (!user) throw new RepositoryError("NOT_FOUND", "Trust card not found", 404);
    const profile = await getOrCreateOpcProfile(user.id);
    if (!profile.publicCard) {
      throw new RepositoryError("FORBIDDEN", "Trust card is not public", 403);
    }
    const metrics = await getOpcTrustMetric(user.id);
    const publicProjects = mockProjects
      .filter((item) => item.creatorId === creator.id)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 6)
      .map((item) => ({
        id: item.id,
        slug: item.slug,
        title: item.title,
        oneLiner: item.oneLiner,
        openSource: item.openSource,
        updatedAt: item.updatedAt,
      }));
    return {
      slug,
      creatorName: user.name,
      avatarUrl: creator.avatarUrl,
      headline: profile.headline ?? creator.headline,
      summary: profile.summary ?? creator.bio,
      serviceScope: profile.serviceScope,
      city: profile.city,
      websiteUrl: profile.websiteUrl ?? creator.websiteUrl,
      proofUrl: profile.proofUrl,
      publicCard: profile.publicCard,
      metrics,
      legalAttestations: mockLegalAttestationLinks
        .filter((item) => item.creatorProfileId === creator.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((item) => ({
          id: item.id,
          label: item.label,
          href: item.href,
        })),
      publicProjects,
    };
  }

  const db = await getPrisma();
  const creator = await db.creatorProfile.findUnique({
    where: { slug },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
      projects: {
        orderBy: { updatedAt: "desc" },
        take: 6,
        select: {
          id: true,
          slug: true,
          title: true,
          oneLiner: true,
          openSource: true,
          updatedAt: true,
        },
      },
      trustCardLinks: {
        orderBy: { createdAt: "desc" },
        select: { id: true, label: true, href: true },
      },
    },
  });
  if (!creator) {
    throw new RepositoryError("NOT_FOUND", "Trust card not found", 404);
  }
  const profile = await getOrCreateOpcProfile(creator.userId);
  if (!profile.publicCard) {
    throw new RepositoryError("FORBIDDEN", "Trust card is not public", 403);
  }
  const metrics = await getOpcTrustMetric(creator.userId);
  return {
    slug,
    creatorName: creator.user.name,
    avatarUrl: creator.user.avatarUrl ?? undefined,
    headline: profile.headline ?? creator.headline,
    summary: profile.summary ?? creator.bio,
    serviceScope: profile.serviceScope,
    city: profile.city,
    websiteUrl: profile.websiteUrl ?? creator.websiteUrl ?? undefined,
    proofUrl: profile.proofUrl,
    publicCard: profile.publicCard,
    metrics,
    legalAttestations: creator.trustCardLinks.map((item) => ({
      id: item.id,
      label: item.label,
      href: item.href,
    })),
    publicProjects: creator.projects.map((item) => ({
      id: item.id,
      slug: item.slug,
      title: item.title,
      oneLiner: item.oneLiner,
      openSource: item.openSource,
      updatedAt: item.updatedAt.toISOString(),
    })),
  };
}
