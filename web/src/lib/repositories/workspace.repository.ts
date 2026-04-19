import { randomUUID } from "crypto";
import type { Prisma, WorkspaceKind as PrismaWorkspaceKind } from "@prisma/client";
import {
  mockAuditLogs,
  mockWorkspaceArtifacts,
  mockWorkspacePreferences,
  mockWorkspaceDeliverables,
  mockCreators,
  mockProjects,
  mockTeamMemberships,
  mockTeams,
  mockUsers,
  mockWorkspaceSnapshots,
} from "@/lib/data/mock-data";
import type {
  AigcProviderApi,
  TeamRole,
  WorkspaceArtifact,
  WorkspaceDeliverable,
  WorkspaceProjectReference,
  WorkspaceSnapshot,
  WorkspaceSummary,
} from "@/lib/types";
import { logger, serializeError } from "@/lib/logger";
import { RepositoryError } from "@/lib/repository-errors";
import { assertV11LegacyWriteAllowed } from "@/lib/repository-errors";
import { getPrisma, useMockData } from "@/lib/repositories/repository-shared";
import { appendEntry, isLedgerWriteThroughEnabled } from "@/lib/repositories/ledger.repository";
import { getUserTier } from "@/lib/repositories/billing.repository";
import { getLimits } from "@/lib/subscription";
import {
  createPresignedGetUrlForKey,
  createWorkspacePresignedPutUrl,
  isObjectStorageConfigured,
} from "@/lib/uploads-presign";
import { isV11BackendLockdownEnabled } from "@/lib/v11-deprecation";

type DbClient = Prisma.TransactionClient | Awaited<ReturnType<typeof getPrisma>>;

export interface WorkspaceAccessRecord extends WorkspaceSummary {
  userId?: string;
  teamId?: string;
  ownerUserId?: string;
  viewerRole?: TeamRole;
  ledgerEnabled?: boolean;
  aigcAutoStamp?: boolean;
  aigcProvider?: AigcProviderApi;
}

export interface WorkspaceArtifactUploadRequest {
  artifact: WorkspaceArtifact;
  upload?: {
    uploadUrl: string;
    requiredHeaders: Record<string, string>;
    completeUrl: string;
  };
  storage: {
    usedBytes: number;
    limitBytes: number;
    maxFileBytes: number;
    configured: boolean;
    mode: "mock" | "object_storage" | "unconfigured";
  };
}

export interface WorkspaceArtifactListResult {
  items: WorkspaceArtifact[];
  storage: {
    usedBytes: number;
    limitBytes: number;
    maxFileBytes: number;
    configured: boolean;
    mode: "mock" | "object_storage" | "unconfigured";
  };
}

export interface WorkspaceDeliverableListResult {
  items: WorkspaceDeliverable[];
}

function personalWorkspaceSlug(userId: string) {
  return `personal-${userId}`;
}

function toWorkspaceSummary(row: {
  id: string;
  kind: PrismaWorkspaceKind;
  slug: string;
  title: string;
  userId: string | null;
  teamId: string | null;
  ledgerEnabled?: boolean;
  aigcAutoStamp?: boolean;
  aigcProvider?: AigcProviderApi;
  user?: { name: string } | null;
  team?: { slug: string; name: string; mission: string | null; ownerUserId?: string; _count?: { memberships: number } } | null;
}): WorkspaceAccessRecord {
  if (row.kind === "team" && row.team) {
    return {
      id: row.id,
      kind: "team",
      slug: row.slug,
      title: row.title,
      subtitle: row.team.mission ?? undefined,
      teamSlug: row.team.slug,
      memberCount: row.team._count?.memberships,
      ownerUserId: row.team.ownerUserId,
      teamId: row.teamId ?? undefined,
      ledgerEnabled: row.ledgerEnabled ?? true,
      aigcAutoStamp: row.aigcAutoStamp ?? true,
      aigcProvider: row.aigcProvider ?? "local",
    };
  }
  return {
    id: row.id,
    kind: "personal",
    slug: "personal",
    title: "个人工作区",
    subtitle: row.user?.name,
    ownerUserId: row.userId ?? undefined,
    userId: row.userId ?? undefined,
    ledgerEnabled: row.ledgerEnabled ?? true,
    aigcAutoStamp: row.aigcAutoStamp ?? true,
    aigcProvider: row.aigcProvider ?? "local",
  };
}

function applyMockWorkspacePreferences(summary: WorkspaceAccessRecord): WorkspaceAccessRecord {
  const override = mockWorkspacePreferences.find((item) => item.workspaceId === summary.id);
  return {
    ...summary,
    ledgerEnabled: override?.ledgerEnabled ?? summary.ledgerEnabled ?? true,
    aigcAutoStamp: override?.aigcAutoStamp ?? summary.aigcAutoStamp ?? true,
    aigcProvider: override?.aigcProvider ?? summary.aigcProvider ?? "local",
  };
}

function normalizeMockProjectBelongsToWorkspace(
  workspace: Pick<WorkspaceAccessRecord, "id" | "kind" | "teamId" | "userId">,
  project: {
    workspaceId?: string;
    teamId?: string;
    creatorId: string;
  }
) {
  if (project.workspaceId && project.workspaceId === workspace.id) return true;
  if (workspace.kind === "team") {
    return Boolean(workspace.teamId && project.teamId === workspace.teamId);
  }
  const creator = mockCreators.find((item) => item.id === project.creatorId);
  return Boolean(!project.teamId && creator?.userId === workspace.userId);
}

function toWorkspaceProjectReference(project: {
  id: string;
  slug: string;
  title: string;
  openSource: boolean;
}): WorkspaceProjectReference {
  return {
    id: project.id,
    slug: project.slug,
    title: project.title,
    openSource: project.openSource,
  };
}

function toWorkspaceArtifactDto(row: {
  id: string;
  workspaceId: string;
  aigcStampId?: string | null;
  requireAigcStamp?: boolean;
  filename: string;
  contentType: string;
  sizeBytes: number;
  storageKey: string;
  uploaderUserId: string;
  uploaderName?: string | null;
  visibility: "workspace";
  validationState: "pending" | "ready" | "rejected";
  publicUrl?: string | null;
  aigcStamp?: {
    provider: AigcProviderApi;
    mode: "text" | "image" | "audio" | "video";
    visibleLabel: string;
    hiddenWatermarkId?: string | null;
    stampedAt: Date | string;
  } | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}): WorkspaceArtifact {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    aigcStampId: row.aigcStampId ?? undefined,
    requireAigcStamp: row.requireAigcStamp ?? true,
    filename: row.filename,
    contentType: row.contentType,
    sizeBytes: row.sizeBytes,
    storageKey: row.storageKey,
    uploaderUserId: row.uploaderUserId,
    uploaderName: row.uploaderName ?? undefined,
    visibility: row.visibility,
    validationState: row.validationState,
    publicUrl: row.publicUrl ?? undefined,
    aigcStampedAt: row.aigcStamp
      ? typeof row.aigcStamp.stampedAt === "string"
        ? row.aigcStamp.stampedAt
        : row.aigcStamp.stampedAt.toISOString()
      : undefined,
    aigcProvider: row.aigcStamp?.provider,
    aigcMode: row.aigcStamp?.mode,
    aigcVisibleLabel: row.aigcStamp?.visibleLabel,
    aigcHiddenWatermarkId: row.aigcStamp?.hiddenWatermarkId ?? undefined,
    createdAt: typeof row.createdAt === "string" ? row.createdAt : row.createdAt.toISOString(),
    updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : row.updatedAt.toISOString(),
  };
}

function toWorkspaceSnapshotDto(row: {
  id: string;
  workspaceId: string;
  ledgerEntryId?: string | null;
  title: string;
  summary: string;
  goal?: string | null;
  roleNotes?: string | null;
  projectIds: string[];
  previousSnapshotId?: string | null;
  previousSnapshotTitle?: string | null;
  createdByUserId: string;
  createdByName?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}, projects: WorkspaceProjectReference[]): WorkspaceSnapshot {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    ledgerEntryId: row.ledgerEntryId ?? undefined,
    title: row.title,
    summary: row.summary,
    goal: row.goal ?? undefined,
    roleNotes: row.roleNotes ?? undefined,
    projectIds: row.projectIds,
    projects,
    previousSnapshotId: row.previousSnapshotId ?? undefined,
    previousSnapshotTitle: row.previousSnapshotTitle ?? undefined,
    createdByUserId: row.createdByUserId,
    createdByName: row.createdByName ?? undefined,
    createdAt: typeof row.createdAt === "string" ? row.createdAt : row.createdAt.toISOString(),
    updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : row.updatedAt.toISOString(),
  };
}

function toWorkspaceDeliverableDto(row: {
  id: string;
  workspaceId: string;
  snapshotId: string;
  ledgerEntryId?: string | null;
  snapshotTitle?: string | null;
  title: string;
  description?: string | null;
  status: "draft" | "submitted" | "approved" | "rejected";
  createdByUserId: string;
  createdByName?: string | null;
  reviewedByUserId?: string | null;
  reviewedByName?: string | null;
  submittedAt?: Date | string | null;
  reviewedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}): WorkspaceDeliverable {
  const toIso = (value?: Date | string | null) =>
    value ? (typeof value === "string" ? value : value.toISOString()) : undefined;

  return {
    id: row.id,
    workspaceId: row.workspaceId,
    snapshotId: row.snapshotId,
    ledgerEntryId: row.ledgerEntryId ?? undefined,
    snapshotTitle: row.snapshotTitle ?? undefined,
    title: row.title,
    description: row.description ?? undefined,
    status: row.status,
    createdByUserId: row.createdByUserId,
    createdByName: row.createdByName ?? undefined,
    reviewedByUserId: row.reviewedByUserId ?? undefined,
    reviewedByName: row.reviewedByName ?? undefined,
    submittedAt: toIso(row.submittedAt),
    reviewedAt: toIso(row.reviewedAt),
    createdAt: typeof row.createdAt === "string" ? row.createdAt : row.createdAt.toISOString(),
    updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : row.updatedAt.toISOString(),
  };
}

function canRollbackWorkspace(access: WorkspaceAccessRecord) {
  if (access.kind === "personal") return true;
  return access.viewerRole === "owner" || access.viewerRole === "admin";
}

function normalizeSnapshotTitle(value: string) {
  return value.trim();
}

function normalizeSnapshotSummary(value: string | undefined) {
  return (value ?? "").trim();
}

async function getAccessibleWorkspace(userId: string, workspaceId: string, client?: DbClient): Promise<WorkspaceAccessRecord> {
  if (useMockData) {
    const workspaces = await listAccessibleWorkspacesForUser(userId);
    const workspace = workspaces.find((item) => item.id === workspaceId);
    if (!workspace) {
      throw new RepositoryError("NOT_FOUND", "Workspace not found", 404);
    }
    if (workspace.kind === "team" && workspace.teamId) {
      const membership = mockTeamMemberships.find(
        (item) => item.teamId === workspace.teamId && item.userId === userId
      );
      return {
        ...applyMockWorkspacePreferences(workspace),
        viewerRole: membership?.role,
      };
    }
    return applyMockWorkspacePreferences(workspace);
  }

  const db = client ?? (await getPrisma());
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      user: { select: { id: true, name: true } },
      team: {
        select: {
          id: true,
          slug: true,
          name: true,
          mission: true,
          ownerUserId: true,
          memberships: {
            where: { userId },
            select: { role: true },
            take: 1,
          },
          _count: { select: { memberships: true } },
        },
      },
    },
  });

  if (!workspace) {
    throw new RepositoryError("NOT_FOUND", "Workspace not found", 404);
  }

  const summary = toWorkspaceSummary({
    id: workspace.id,
    kind: workspace.kind,
    slug: workspace.slug,
    title: workspace.title,
    userId: workspace.userId,
    teamId: workspace.teamId,
    ledgerEnabled: (workspace as { ledgerEnabled?: boolean }).ledgerEnabled,
    aigcAutoStamp: (workspace as { aigcAutoStamp?: boolean }).aigcAutoStamp,
    aigcProvider: (workspace as { aigcProvider?: AigcProviderApi }).aigcProvider,
    user: workspace.user ? { name: workspace.user.name } : null,
    team: workspace.team
      ? {
          slug: workspace.team.slug,
          name: workspace.team.name,
          mission: workspace.team.mission,
          ownerUserId: workspace.team.ownerUserId,
          _count: { memberships: workspace.team._count.memberships },
        }
      : null,
  });

  if (workspace.kind === "personal") {
    if (workspace.userId !== userId) {
      throw new RepositoryError("FORBIDDEN", "You do not have access to this workspace", 403);
    }
    return summary;
  }

  const membership = workspace.team?.memberships[0];
  if (!membership) {
    throw new RepositoryError("FORBIDDEN", "You do not have access to this workspace", 403);
  }

  return {
    ...summary,
    viewerRole: membership.role,
  };
}

async function appendSnapshotAuditLog(
  actorId: string,
  action: "workspace.snapshot.created" | "workspace.snapshot.rolled_back",
  snapshotId: string,
  metadata: Record<string, unknown>,
  client?: DbClient
) {
  if (useMockData) {
    mockAuditLogs.push({
      id: `audit_${randomUUID()}`,
      actorId,
      action,
      entityType: "workspace_snapshot",
      entityId: snapshotId,
      metadata,
      createdAt: new Date().toISOString(),
    });
    return;
  }

  const db = client ?? (await getPrisma());
  await db.auditLog.create({
    data: {
      actorId,
      action,
      entityType: "workspace_snapshot",
      entityId: snapshotId,
      metadata: metadata as Prisma.InputJsonValue,
    },
  });
}

async function appendArtifactAuditLog(
  actorId: string,
  action:
    | "workspace.artifact.upload_requested"
    | "workspace.artifact.ready"
    | "workspace.artifact.deleted",
  artifactId: string,
  metadata: Record<string, unknown>,
  client?: DbClient
) {
  if (useMockData) {
    mockAuditLogs.push({
      id: `audit_${randomUUID()}`,
      actorId,
      action,
      entityType: "workspace_artifact",
      entityId: artifactId,
      metadata,
      createdAt: new Date().toISOString(),
    });
    return;
  }

  const db = client ?? (await getPrisma());
  await db.auditLog.create({
    data: {
      actorId,
      action,
      entityType: "workspace_artifact",
      entityId: artifactId,
      metadata: metadata as Prisma.InputJsonValue,
    },
  });
}

async function appendDeliverableAuditLog(
  actorId: string,
  action:
    | "workspace.deliverable.created"
    | "workspace.deliverable.submitted"
    | "workspace.deliverable.reviewed",
  deliverableId: string,
  metadata: Record<string, unknown>,
  client?: DbClient
) {
  if (useMockData) {
    mockAuditLogs.push({
      id: `audit_${randomUUID()}`,
      actorId,
      action,
      entityType: "workspace_deliverable",
      entityId: deliverableId,
      metadata,
      createdAt: new Date().toISOString(),
    });
    return;
  }

  const db = client ?? (await getPrisma());
  await db.auditLog.create({
    data: {
      actorId,
      action,
      entityType: "workspace_deliverable",
      entityId: deliverableId,
      metadata: metadata as Prisma.InputJsonValue,
    },
  });
}

async function getWorkspaceTierLimits(access: WorkspaceAccessRecord) {
  const ownerUserId = access.kind === "personal" ? access.userId : access.ownerUserId;
  if (!ownerUserId) {
    throw new RepositoryError("INTERNAL", "Workspace owner could not be determined", 500);
  }
  const tier = await getUserTier(ownerUserId);
  return getLimits(tier);
}

async function getWorkspaceArtifactUsageBytes(workspaceId: string): Promise<number> {
  if (useMockData) {
    return mockWorkspaceArtifacts
      .filter((artifact) => artifact.workspaceId === workspaceId && artifact.validationState !== "rejected")
      .reduce((sum, artifact) => sum + artifact.sizeBytes, 0);
  }
  const db = await getPrisma();
  const aggregate = await db.workspaceArtifact.aggregate({
    where: {
      workspaceId,
      validationState: { not: "rejected" },
    },
    _sum: { sizeBytes: true },
  });
  return aggregate._sum.sizeBytes ?? 0;
}

export async function ensurePersonalWorkspace(userId: string, client?: DbClient): Promise<WorkspaceAccessRecord> {
  if (useMockData) {
    const user = mockUsers.find((item) => item.id === userId);
    if (!user) throw new Error("USER_NOT_FOUND");
    return {
      ...applyMockWorkspacePreferences({
      id: `personal:${userId}`,
      kind: "personal",
      slug: "personal",
      title: "个人工作区",
      subtitle: user.name,
      userId,
      ledgerEnabled: true,
      aigcAutoStamp: true,
      aigcProvider: "local",
      }),
    };
  }

  const db = client ?? (await getPrisma());
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true },
  });
  if (!user) throw new Error("USER_NOT_FOUND");

  const workspace = await db.workspace.upsert({
    where: { userId: user.id },
    update: {
      kind: "personal",
      slug: personalWorkspaceSlug(user.id),
      title: "个人工作区",
    },
    create: {
      kind: "personal",
      slug: personalWorkspaceSlug(user.id),
      title: "个人工作区",
      userId: user.id,
    },
    include: {
      user: { select: { name: true } },
      team: { select: { slug: true, name: true, mission: true, _count: { select: { memberships: true } } } },
    },
  });

  return toWorkspaceSummary(workspace);
}

export async function ensureTeamWorkspace(
  teamId: string,
  client?: DbClient,
  teamSeed?: { id: string; slug: string; name: string; mission?: string | null; memberCount?: number; ownerUserId?: string }
): Promise<WorkspaceAccessRecord> {
  if (useMockData) {
    const team = mockTeams.find((item) => item.id === teamId);
    if (!team) throw new Error("TEAM_NOT_FOUND");
    return {
      ...applyMockWorkspacePreferences({
      id: `team:${team.id}`,
      kind: "team",
      slug: team.slug,
      title: team.name,
      subtitle: team.mission,
      teamSlug: team.slug,
      teamId: team.id,
      ownerUserId: team.ownerUserId,
      memberCount: mockTeamMemberships.filter((membership) => membership.teamId === team.id).length,
      ledgerEnabled: true,
      aigcAutoStamp: true,
      aigcProvider: "local",
      }),
    };
  }

  const db = client ?? (await getPrisma());
  const existing = await db.workspace.findUnique({
    where: { teamId },
    include: {
      user: { select: { name: true } },
      team: { select: { slug: true, name: true, mission: true, ownerUserId: true, _count: { select: { memberships: true } } } },
    },
  });
  if (existing) {
    return toWorkspaceSummary(existing);
  }
  if (isV11BackendLockdownEnabled()) {
    assertV11LegacyWriteAllowed("TEAM_WORKSPACE_DEPRECATED");
  }

  const team =
    teamSeed ??
    (await db.team.findUnique({
      where: { id: teamId },
      select: {
        id: true,
        slug: true,
        name: true,
        mission: true,
        ownerUserId: true,
        _count: { select: { memberships: true } },
      },
    }));
  if (!team) throw new Error("TEAM_NOT_FOUND");

  const workspace = await db.workspace.upsert({
    where: { teamId: team.id },
    update: {
      kind: "team",
      slug: team.slug,
      title: team.name,
    },
    create: {
      kind: "team",
      slug: team.slug,
      title: team.name,
      teamId: team.id,
    },
    include: {
      user: { select: { name: true } },
      team: { select: { slug: true, name: true, mission: true, ownerUserId: true, _count: { select: { memberships: true } } } },
    },
  });

  return toWorkspaceSummary(workspace);
}

export async function listAccessibleWorkspacesForUser(userId: string): Promise<WorkspaceAccessRecord[]> {
  if (useMockData) {
    const personal = await ensurePersonalWorkspace(userId);
    const teamIds = new Set(
      mockTeamMemberships.filter((membership) => membership.userId === userId).map((membership) => membership.teamId)
    );
    const teams = mockTeams
      .filter((team) => teamIds.has(team.id))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return [
      personal,
      ...teams.map((team) => ({
        ...applyMockWorkspacePreferences({
          id: `team:${team.id}`,
          kind: "team" as const,
          slug: team.slug,
          title: team.name,
          subtitle: team.mission,
          teamSlug: team.slug,
          teamId: team.id,
          ownerUserId: team.ownerUserId,
          memberCount: mockTeamMemberships.filter((membership) => membership.teamId === team.id).length,
          ledgerEnabled: true,
          aigcAutoStamp: true,
          aigcProvider: "local",
        }),
      })),
    ];
  }

  const db = await getPrisma();
  const [personal, teams] = await Promise.all([
    ensurePersonalWorkspace(userId, db),
    db.team.findMany({
      where: { memberships: { some: { userId } } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        slug: true,
        name: true,
        mission: true,
        ownerUserId: true,
        _count: { select: { memberships: true } },
      },
    }),
  ]);

  const teamWorkspaces = await Promise.all(
    teams.map((team) =>
      ensureTeamWorkspace(team.id, db, {
        id: team.id,
        slug: team.slug,
        name: team.name,
        mission: team.mission,
        ownerUserId: team.ownerUserId,
        memberCount: team._count.memberships,
      })
    )
  );

  return [personal, ...teamWorkspaces];
}

export async function listWorkspaceProjects(params: {
  userId: string;
  workspaceId: string;
}): Promise<WorkspaceProjectReference[]> {
  const workspace = await getAccessibleWorkspace(params.userId, params.workspaceId);

  if (useMockData) {
    return mockProjects
      .filter((project) => normalizeMockProjectBelongsToWorkspace(workspace, project))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((project) => toWorkspaceProjectReference(project));
  }

  const db = await getPrisma();
  const rows = await db.project.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      openSource: true,
    },
  });

  return rows.map((row) => toWorkspaceProjectReference(row));
}

function canDeleteWorkspaceArtifact(
  access: WorkspaceAccessRecord,
  artifact: Pick<WorkspaceArtifact, "uploaderUserId">,
  actorId: string
) {
  if (access.kind === "personal") {
    return access.userId === actorId;
  }
  if (access.viewerRole === "owner" || access.viewerRole === "admin") {
    return true;
  }
  return artifact.uploaderUserId === actorId;
}

function canReviewWorkspaceDeliverable(access: WorkspaceAccessRecord, actorId: string) {
  if (access.kind === "personal") {
    return access.userId === actorId;
  }
  return access.viewerRole === "owner" || access.viewerRole === "admin";
}

function getWorkspaceStorageMode() {
  if (useMockData) return "mock" as const;
  return isObjectStorageConfigured() ? ("object_storage" as const) : ("unconfigured" as const);
}

async function appendWorkspaceLedgerEntry(params: {
  workspace: WorkspaceAccessRecord;
  actorType: "user" | "agent";
  actorId: string;
  actionKind: string;
  targetType?: string;
  targetId?: string;
  payload: Record<string, unknown>;
  signedAt?: Date;
  client?: DbClient;
}) {
  if (params.workspace.ledgerEnabled === false || !isLedgerWriteThroughEnabled()) {
    return null;
  }
  return appendEntry({
    workspaceId: params.workspace.id,
    actorType: params.actorType,
    actorId: params.actorId,
    actionKind: params.actionKind,
    targetType: params.targetType,
    targetId: params.targetId,
    payload: params.payload,
    signedAt: params.signedAt,
    client: params.client,
  });
}

async function enqueueWorkspaceTrustMetricRecompute(userId: string, reason: string) {
  try {
    const { enqueueTrustMetricRecompute } = await import("@/lib/queue/recompute-trust-metric-queue");
    await enqueueTrustMetricRecompute({ userId, reason });
  } catch {
    // Ignore trust metric refresh failures on workspace write paths.
  }
}

export async function listWorkspaceArtifacts(params: {
  userId: string;
  workspaceId: string;
}): Promise<WorkspaceArtifactListResult> {
  const workspace = await getAccessibleWorkspace(params.userId, params.workspaceId);
  const limits = await getWorkspaceTierLimits(workspace);
  const usedBytes = await getWorkspaceArtifactUsageBytes(workspace.id);

  if (useMockData) {
    return {
      items: mockWorkspaceArtifacts
        .filter((artifact) => artifact.workspaceId === workspace.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      storage: {
        usedBytes,
        limitBytes: limits.workspaceStorageMb * 1024 * 1024,
        maxFileBytes: limits.maxWorkspaceFileBytes,
        configured: false,
        mode: "mock",
      },
    };
  }

  const db = await getPrisma();
  const rows = await db.workspaceArtifact.findMany({
    where: { workspaceId: workspace.id },
    include: {
      uploader: { select: { id: true, name: true } },
      aigcStamp: {
        select: {
          provider: true,
          mode: true,
          visibleLabel: true,
          hiddenWatermarkId: true,
          stampedAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    items: rows.map((row) =>
      toWorkspaceArtifactDto({
        id: row.id,
        workspaceId: row.workspaceId,
        aigcStampId: (row as { aigcStampId?: string | null }).aigcStampId,
        requireAigcStamp: (row as { requireAigcStamp?: boolean }).requireAigcStamp,
        filename: row.filename,
        contentType: row.contentType,
        sizeBytes: row.sizeBytes,
        storageKey: row.storageKey,
        uploaderUserId: row.uploaderUserId,
        uploaderName: row.uploader.name,
        visibility: row.visibility,
        validationState: row.validationState,
        publicUrl: row.publicUrl,
        aigcStamp: row.aigcStamp,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })
    ),
    storage: {
      usedBytes,
      limitBytes: limits.workspaceStorageMb * 1024 * 1024,
      maxFileBytes: limits.maxWorkspaceFileBytes,
      configured: getWorkspaceStorageMode() === "object_storage",
      mode: getWorkspaceStorageMode(),
    },
  };
}

export async function requestWorkspaceArtifactUpload(params: {
  userId: string;
  workspaceId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
}): Promise<WorkspaceArtifactUploadRequest> {
  const workspace = await getAccessibleWorkspace(params.userId, params.workspaceId);
  const filename = params.filename.trim();
  const contentType = params.contentType.trim().toLowerCase();
  const sizeBytes = params.sizeBytes;

  if (!filename) {
    throw new RepositoryError("INVALID_INPUT", "Filename is required", 400);
  }
  if (!contentType) {
    throw new RepositoryError("INVALID_INPUT", "Content type is required", 400);
  }
  if (!Number.isInteger(sizeBytes) || sizeBytes <= 0) {
    throw new RepositoryError("INVALID_INPUT", "File size must be a positive integer", 400);
  }

  const limits = await getWorkspaceTierLimits(workspace);
  const limitBytes = limits.workspaceStorageMb * 1024 * 1024;
  const maxFileBytes = limits.maxWorkspaceFileBytes;
  if (sizeBytes > maxFileBytes) {
    throw new RepositoryError("INVALID_INPUT", "File exceeds the per-upload size limit", 400, { maxFileBytes });
  }

  const usedBytes = await getWorkspaceArtifactUsageBytes(workspace.id);
  if (usedBytes + sizeBytes > limitBytes) {
    throw new RepositoryError("CONFLICT", "Workspace storage quota exceeded", 409, {
      usedBytes,
      limitBytes,
      requestedBytes: sizeBytes,
    });
  }

  if (useMockData) {
    const now = new Date().toISOString();
    const uploader = mockUsers.find((item) => item.id === params.userId);
    const artifact: WorkspaceArtifact = {
      id: randomUUID(),
      workspaceId: workspace.id,
      filename,
      contentType,
      sizeBytes,
      storageKey: `mock://workspace/${workspace.id}/${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]+/g, "_")}`,
      uploaderUserId: params.userId,
      uploaderName: uploader?.name,
      requireAigcStamp: workspace.aigcAutoStamp !== false,
      visibility: "workspace",
      validationState: "ready",
      createdAt: now,
      updatedAt: now,
    };
    mockWorkspaceArtifacts.push(artifact);
    await appendArtifactAuditLog(params.userId, "workspace.artifact.upload_requested", artifact.id, {
      workspaceId: workspace.id,
      filename,
      contentType,
      sizeBytes,
      mode: "mock",
    });
    await appendArtifactAuditLog(params.userId, "workspace.artifact.ready", artifact.id, {
      workspaceId: workspace.id,
      filename,
      sizeBytes,
      mode: "mock",
    });
    if (artifact.requireAigcStamp !== false && workspace.aigcAutoStamp !== false) {
      try {
        const { enqueueAigcStamp } = await import("@/lib/queue/aigc-stamp-queue");
        await enqueueAigcStamp({
          artifactId: artifact.id,
          workspaceId: workspace.id,
          actorUserId: params.userId,
          trigger: "auto",
        });
      } catch (error) {
        logger.error({ err: serializeError(error), artifactId: artifact.id }, "Failed to enqueue mock AIGC stamp job");
      }
    }
    return {
      artifact,
      storage: {
        usedBytes: usedBytes + sizeBytes,
        limitBytes,
        maxFileBytes,
        configured: false,
        mode: "mock",
      },
    };
  }

  const presigned = await createWorkspacePresignedPutUrl({
    workspaceId: workspace.id,
    userId: params.userId,
    filename,
    contentType,
    sizeBytes,
    maxBytes: maxFileBytes,
  });
  if (!presigned) {
    throw new RepositoryError("INTERNAL", "Workspace file uploads are not configured", 503);
  }

  const db = await getPrisma();
  const created = await db.workspaceArtifact.create({
    data: {
      workspaceId: workspace.id,
      uploaderUserId: params.userId,
      requireAigcStamp: workspace.aigcAutoStamp !== false,
      filename,
      contentType,
      sizeBytes,
      storageKey: presigned.key,
      visibility: "workspace",
      validationState: "pending",
      publicUrl: presigned.publicUrl,
    },
    include: { uploader: { select: { id: true, name: true } } },
  });

  await appendArtifactAuditLog(
    params.userId,
    "workspace.artifact.upload_requested",
    created.id,
    {
      workspaceId: workspace.id,
      filename,
      contentType,
      sizeBytes,
      storageKey: created.storageKey,
      mode: "object_storage",
    },
    db
  );

  return {
    artifact: toWorkspaceArtifactDto({
      id: created.id,
      workspaceId: created.workspaceId,
      aigcStampId: (created as { aigcStampId?: string | null }).aigcStampId,
      requireAigcStamp: (created as { requireAigcStamp?: boolean }).requireAigcStamp,
      filename: created.filename,
      contentType: created.contentType,
      sizeBytes: created.sizeBytes,
      storageKey: created.storageKey,
      uploaderUserId: created.uploaderUserId,
      uploaderName: created.uploader.name,
      visibility: created.visibility,
      validationState: created.validationState,
      publicUrl: created.publicUrl,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    }),
    upload: {
      uploadUrl: presigned.uploadUrl,
      requiredHeaders: presigned.requiredHeaders,
      completeUrl: `/api/v1/workspaces/${encodeURIComponent(workspace.id)}/artifacts/${encodeURIComponent(created.id)}/complete`,
    },
    storage: {
      usedBytes: usedBytes + sizeBytes,
      limitBytes,
      maxFileBytes,
      configured: true,
      mode: "object_storage",
    },
  };
}

export async function completeWorkspaceArtifactUpload(params: {
  userId: string;
  workspaceId: string;
  artifactId: string;
}): Promise<WorkspaceArtifact> {
  const workspace = await getAccessibleWorkspace(params.userId, params.workspaceId);

  if (useMockData) {
    const artifact = mockWorkspaceArtifacts.find(
      (item) => item.id === params.artifactId && item.workspaceId === workspace.id
    );
    if (!artifact) {
      throw new RepositoryError("NOT_FOUND", "Workspace artifact not found", 404);
    }
    if (!canDeleteWorkspaceArtifact(workspace, artifact, params.userId)) {
      throw new RepositoryError("FORBIDDEN", "You cannot complete this upload", 403);
    }
    artifact.validationState = "ready";
    artifact.updatedAt = new Date().toISOString();
    await appendArtifactAuditLog(params.userId, "workspace.artifact.ready", artifact.id, {
      workspaceId: workspace.id,
      filename: artifact.filename,
      sizeBytes: artifact.sizeBytes,
      mode: "mock",
    });
    await appendWorkspaceLedgerEntry({
      workspace,
      actorType: "user",
      actorId: params.userId,
      actionKind: "workspace.artifact.ready",
      targetType: "workspace_artifact",
      targetId: artifact.id,
      payload: {
        workspaceId: workspace.id,
        artifactId: artifact.id,
        filename: artifact.filename,
        contentType: artifact.contentType,
        sizeBytes: artifact.sizeBytes,
        validationState: artifact.validationState,
        mode: "mock",
      },
    });
    if (artifact.requireAigcStamp !== false && workspace.aigcAutoStamp !== false) {
      try {
        const { enqueueAigcStamp } = await import("@/lib/queue/aigc-stamp-queue");
        await enqueueAigcStamp({
          artifactId: artifact.id,
          workspaceId: workspace.id,
          actorUserId: params.userId,
          trigger: "auto",
        });
      } catch (error) {
        logger.error({ err: serializeError(error), artifactId: artifact.id }, "Failed to enqueue mock AIGC stamp job");
      }
    }
    return artifact;
  }

  const db = await getPrisma();
  const existing = await db.workspaceArtifact.findUnique({
    where: { id: params.artifactId },
    include: { uploader: { select: { id: true, name: true } } },
  });
  if (!existing || existing.workspaceId !== workspace.id) {
    throw new RepositoryError("NOT_FOUND", "Workspace artifact not found", 404);
  }
  if (
    !canDeleteWorkspaceArtifact(
      workspace,
      { uploaderUserId: existing.uploaderUserId },
      params.userId
    )
  ) {
    throw new RepositoryError("FORBIDDEN", "You cannot complete this upload", 403);
  }

  const updated = await db.workspaceArtifact.update({
    where: { id: existing.id },
    data: { validationState: "ready" },
    include: {
      uploader: { select: { id: true, name: true } },
      aigcStamp: {
        select: {
          provider: true,
          mode: true,
          visibleLabel: true,
          hiddenWatermarkId: true,
          stampedAt: true,
        },
      },
    },
  });

  await appendArtifactAuditLog(
    params.userId,
    "workspace.artifact.ready",
    updated.id,
    {
      workspaceId: workspace.id,
      filename: updated.filename,
      sizeBytes: updated.sizeBytes,
      mode: getWorkspaceStorageMode(),
    },
    db
  );
  await appendWorkspaceLedgerEntry({
    workspace,
    actorType: "user",
    actorId: params.userId,
    actionKind: "workspace.artifact.ready",
    targetType: "workspace_artifact",
    targetId: updated.id,
    payload: {
      workspaceId: workspace.id,
      artifactId: updated.id,
      filename: updated.filename,
      contentType: updated.contentType,
      sizeBytes: updated.sizeBytes,
      validationState: updated.validationState,
      mode: getWorkspaceStorageMode(),
    },
    client: db,
  });
  if (updated.requireAigcStamp !== false && workspace.aigcAutoStamp !== false) {
    try {
      const { enqueueAigcStamp } = await import("@/lib/queue/aigc-stamp-queue");
      await enqueueAigcStamp({
        artifactId: updated.id,
        workspaceId: workspace.id,
        actorUserId: params.userId,
        trigger: "auto",
      });
    } catch (error) {
      logger.error({ err: serializeError(error), artifactId: updated.id }, "Failed to enqueue AIGC stamp job");
    }
  }

  return toWorkspaceArtifactDto({
    id: updated.id,
    workspaceId: updated.workspaceId,
    aigcStampId: (updated as { aigcStampId?: string | null }).aigcStampId,
    requireAigcStamp: (updated as { requireAigcStamp?: boolean }).requireAigcStamp,
    filename: updated.filename,
    contentType: updated.contentType,
    sizeBytes: updated.sizeBytes,
    storageKey: updated.storageKey,
    uploaderUserId: updated.uploaderUserId,
    uploaderName: updated.uploader.name,
    visibility: updated.visibility,
    validationState: updated.validationState,
    publicUrl: updated.publicUrl,
    aigcStamp: updated.aigcStamp,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  });
}

export async function deleteWorkspaceArtifact(params: {
  userId: string;
  workspaceId: string;
  artifactId: string;
}): Promise<{ ok: true }> {
  const workspace = await getAccessibleWorkspace(params.userId, params.workspaceId);

  if (useMockData) {
    const index = mockWorkspaceArtifacts.findIndex(
      (item) => item.id === params.artifactId && item.workspaceId === workspace.id
    );
    if (index < 0) {
      throw new RepositoryError("NOT_FOUND", "Workspace artifact not found", 404);
    }
    const artifact = mockWorkspaceArtifacts[index];
    if (!canDeleteWorkspaceArtifact(workspace, artifact, params.userId)) {
      throw new RepositoryError("FORBIDDEN", "You cannot delete this artifact", 403);
    }
    mockWorkspaceArtifacts.splice(index, 1);
    await appendArtifactAuditLog(params.userId, "workspace.artifact.deleted", artifact.id, {
      workspaceId: workspace.id,
      filename: artifact.filename,
      sizeBytes: artifact.sizeBytes,
      mode: "mock",
    });
    return { ok: true };
  }

  const db = await getPrisma();
  const artifact = await db.workspaceArtifact.findUnique({
    where: { id: params.artifactId },
  });
  if (!artifact || artifact.workspaceId !== workspace.id) {
    throw new RepositoryError("NOT_FOUND", "Workspace artifact not found", 404);
  }
  if (
    !canDeleteWorkspaceArtifact(
      workspace,
      { uploaderUserId: artifact.uploaderUserId },
      params.userId
    )
  ) {
    throw new RepositoryError("FORBIDDEN", "You cannot delete this artifact", 403);
  }

  await db.workspaceArtifact.delete({ where: { id: artifact.id } });
  await appendArtifactAuditLog(
    params.userId,
    "workspace.artifact.deleted",
    artifact.id,
    {
      workspaceId: workspace.id,
      filename: artifact.filename,
      sizeBytes: artifact.sizeBytes,
      mode: getWorkspaceStorageMode(),
    },
    db
  );
  return { ok: true };
}

export async function getWorkspaceArtifactDownloadUrl(params: {
  userId: string;
  workspaceId: string;
  artifactId: string;
}): Promise<{ artifact: WorkspaceArtifact; downloadUrl: string }> {
  const workspace = await getAccessibleWorkspace(params.userId, params.workspaceId);

  if (useMockData) {
    const artifact = mockWorkspaceArtifacts.find(
      (item) => item.id === params.artifactId && item.workspaceId === workspace.id
    );
    if (!artifact) {
      throw new RepositoryError("NOT_FOUND", "Workspace artifact not found", 404);
    }
    if (artifact.validationState !== "ready") {
      throw new RepositoryError("CONFLICT", "Artifact is not ready for download", 409);
    }
    const payload = `Mock workspace artifact\n\nWorkspace: ${workspace.title}\nFile: ${artifact.filename}\nType: ${artifact.contentType}\nSize: ${artifact.sizeBytes} bytes\n`;
    return {
      artifact,
      downloadUrl: `data:text/plain;charset=utf-8,${encodeURIComponent(payload)}`,
    };
  }

  const db = await getPrisma();
  const artifact = await db.workspaceArtifact.findUnique({
    where: { id: params.artifactId },
    include: {
      uploader: { select: { id: true, name: true } },
      aigcStamp: {
        select: {
          provider: true,
          mode: true,
          visibleLabel: true,
          hiddenWatermarkId: true,
          stampedAt: true,
        },
      },
    },
  });
  if (!artifact || artifact.workspaceId !== workspace.id) {
    throw new RepositoryError("NOT_FOUND", "Workspace artifact not found", 404);
  }
  if (artifact.validationState !== "ready") {
    throw new RepositoryError("CONFLICT", "Artifact is not ready for download", 409);
  }

  const downloadUrl =
    artifact.publicUrl && /^https?:\/\//i.test(artifact.publicUrl)
      ? artifact.publicUrl
      : await createPresignedGetUrlForKey({
          key: artifact.storageKey,
          filename: artifact.filename,
        });

  if (!downloadUrl) {
    throw new RepositoryError("INTERNAL", "Workspace file downloads are not configured", 503);
  }

  return {
    artifact: toWorkspaceArtifactDto({
      id: artifact.id,
      workspaceId: artifact.workspaceId,
      aigcStampId: (artifact as { aigcStampId?: string | null }).aigcStampId,
      requireAigcStamp: (artifact as { requireAigcStamp?: boolean }).requireAigcStamp,
      filename: artifact.filename,
      contentType: artifact.contentType,
      sizeBytes: artifact.sizeBytes,
      storageKey: artifact.storageKey,
      uploaderUserId: artifact.uploaderUserId,
      uploaderName: artifact.uploader.name,
      visibility: artifact.visibility,
      validationState: artifact.validationState,
      publicUrl: artifact.publicUrl,
      aigcStamp: artifact.aigcStamp,
      createdAt: artifact.createdAt,
      updatedAt: artifact.updatedAt,
    }),
    downloadUrl,
  };
}

export async function listWorkspaceSnapshots(params: {
  userId: string;
  workspaceId: string;
}): Promise<WorkspaceSnapshot[]> {
  const workspace = await getAccessibleWorkspace(params.userId, params.workspaceId);
  const projects = await listWorkspaceProjects({ userId: params.userId, workspaceId: workspace.id });
  const projectMap = new Map(projects.map((project) => [project.id, project]));

  if (useMockData) {
    return mockWorkspaceSnapshots
      .filter((snapshot) => snapshot.workspaceId === workspace.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((snapshot) =>
        toWorkspaceSnapshotDto(
          {
            ...snapshot,
            ledgerEntryId: snapshot.ledgerEntryId,
            previousSnapshotTitle:
              snapshot.previousSnapshotId
                ? mockWorkspaceSnapshots.find((item) => item.id === snapshot.previousSnapshotId)?.title
                : undefined,
          },
          snapshot.projectIds.map((projectId) => projectMap.get(projectId)).filter(Boolean) as WorkspaceProjectReference[]
        )
      );
  }

  const db = await getPrisma();
  const rows = await db.snapshotCapsule.findMany({
    where: { workspaceId: workspace.id },
    include: {
      createdBy: { select: { id: true, name: true } },
      previousSnapshot: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((row) =>
    toWorkspaceSnapshotDto(
      {
        id: row.id,
        workspaceId: row.workspaceId,
        ledgerEntryId: (row as { ledgerEntryId?: string | null }).ledgerEntryId,
        title: row.title,
        summary: row.summary,
        goal: row.goal,
        roleNotes: row.roleNotes,
        projectIds: row.projectIds,
        previousSnapshotId: row.previousSnapshotId,
        previousSnapshotTitle: row.previousSnapshot?.title,
        createdByUserId: row.createdByUserId,
        createdByName: row.createdBy.name,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
      row.projectIds.map((projectId) => projectMap.get(projectId)).filter(Boolean) as WorkspaceProjectReference[]
    )
  );
}

export async function getWorkspaceSnapshot(params: {
  userId: string;
  workspaceId: string;
  snapshotId: string;
}): Promise<WorkspaceSnapshot | null> {
  const workspace = await getAccessibleWorkspace(params.userId, params.workspaceId);
  const snapshots = await listWorkspaceSnapshots({ userId: params.userId, workspaceId: workspace.id });
  return snapshots.find((snapshot) => snapshot.id === params.snapshotId) ?? null;
}

export async function createWorkspaceSnapshot(params: {
  userId: string;
  workspaceId: string;
  title: string;
  summary: string;
  goal?: string;
  roleNotes?: string;
  projectIds?: string[];
  previousSnapshotId?: string;
  ledgerActionKind?: "workspace.snapshot.created" | "workspace.snapshot.rolled_back";
}): Promise<WorkspaceSnapshot> {
  const workspace = await getAccessibleWorkspace(params.userId, params.workspaceId);
  const title = normalizeSnapshotTitle(params.title);
  const summary = normalizeSnapshotSummary(params.summary);
  if (!title) {
    throw new RepositoryError("INVALID_INPUT", "Snapshot title is required", 400);
  }
  if (!summary) {
    throw new RepositoryError("INVALID_INPUT", "Snapshot summary is required", 400);
  }

  const workspaceProjects = await listWorkspaceProjects({ userId: params.userId, workspaceId: workspace.id });
  const projectMap = new Map(workspaceProjects.map((project) => [project.id, project]));
  const selectedProjectIds = (params.projectIds?.length ? params.projectIds : workspaceProjects.map((project) => project.id))
    .filter((projectId, index, array) => array.indexOf(projectId) === index)
    .filter((projectId) => projectMap.has(projectId));

  if (selectedProjectIds.length === 0) {
    throw new RepositoryError("INVALID_INPUT", "Select at least one workspace project", 400);
  }

  if (params.previousSnapshotId) {
    const previous = await getWorkspaceSnapshot({
      userId: params.userId,
      workspaceId: workspace.id,
      snapshotId: params.previousSnapshotId,
    });
    if (!previous) {
      throw new RepositoryError("NOT_FOUND", "Previous snapshot not found", 404);
    }
  }

  if (useMockData) {
    const user = mockUsers.find((item) => item.id === params.userId);
    const now = new Date().toISOString();
    const snapshot: WorkspaceSnapshot = {
      id: randomUUID(),
      workspaceId: workspace.id,
      ledgerEntryId: undefined,
      title,
      summary,
      goal: params.goal?.trim() || undefined,
      roleNotes: params.roleNotes?.trim() || undefined,
      projectIds: selectedProjectIds,
      projects: selectedProjectIds.map((projectId) => projectMap.get(projectId)).filter(Boolean) as WorkspaceProjectReference[],
      previousSnapshotId: params.previousSnapshotId,
      previousSnapshotTitle: params.previousSnapshotId
        ? mockWorkspaceSnapshots.find((item) => item.id === params.previousSnapshotId)?.title
        : undefined,
      createdByUserId: params.userId,
      createdByName: user?.name,
      createdAt: now,
      updatedAt: now,
    };
    mockWorkspaceSnapshots.push(snapshot);
    await appendSnapshotAuditLog(params.userId, "workspace.snapshot.created", snapshot.id, {
      workspaceId: workspace.id,
      title: snapshot.title,
      previousSnapshotId: params.previousSnapshotId ?? null,
      projectIds: selectedProjectIds,
      teamId: workspace.teamId ?? null,
    });
    const ledgerEntry = await appendWorkspaceLedgerEntry({
      workspace,
      actorType: "user",
      actorId: params.userId,
      actionKind: params.ledgerActionKind ?? "workspace.snapshot.created",
      targetType: "workspace_snapshot",
      targetId: snapshot.id,
      payload: {
        workspaceId: workspace.id,
        snapshotId: snapshot.id,
        title: snapshot.title,
        summary: snapshot.summary,
        projectIds: selectedProjectIds,
        previousSnapshotId: params.previousSnapshotId ?? null,
      },
      signedAt: new Date(now),
    });
    if (ledgerEntry) {
      snapshot.ledgerEntryId = ledgerEntry.id;
    }
    if (workspace.ledgerEnabled === false || !isLedgerWriteThroughEnabled()) {
      await enqueueWorkspaceTrustMetricRecompute(params.userId, params.ledgerActionKind ?? "workspace.snapshot.created");
    }
    return snapshot;
  }

  const db = await getPrisma();
  const created = await db.snapshotCapsule.create({
    data: {
      workspaceId: workspace.id,
      createdByUserId: params.userId,
      title,
      summary,
      goal: params.goal?.trim() || null,
      roleNotes: params.roleNotes?.trim() || null,
      projectIds: selectedProjectIds,
      previousSnapshotId: params.previousSnapshotId ?? null,
    },
    include: {
      createdBy: { select: { id: true, name: true } },
      previousSnapshot: { select: { id: true, title: true } },
    },
  });

  await appendSnapshotAuditLog(params.userId, "workspace.snapshot.created", created.id, {
    workspaceId: workspace.id,
    title: created.title,
    previousSnapshotId: created.previousSnapshotId,
    projectIds: selectedProjectIds,
    teamId: workspace.teamId ?? null,
  }, db);
  const ledgerEntry = await appendWorkspaceLedgerEntry({
    workspace,
    actorType: "user",
    actorId: params.userId,
    actionKind: params.ledgerActionKind ?? "workspace.snapshot.created",
    targetType: "workspace_snapshot",
    targetId: created.id,
    payload: {
      workspaceId: workspace.id,
      snapshotId: created.id,
      title: created.title,
      summary: created.summary,
      projectIds: selectedProjectIds,
      previousSnapshotId: created.previousSnapshotId,
    },
    signedAt: created.createdAt,
    client: db,
  });
  if (ledgerEntry) {
    await db.snapshotCapsule.update({
      where: { id: created.id },
      data: { ledgerEntry: { connect: { id: ledgerEntry.id } } },
    });
  }
  if (workspace.ledgerEnabled === false || !isLedgerWriteThroughEnabled()) {
    await enqueueWorkspaceTrustMetricRecompute(params.userId, params.ledgerActionKind ?? "workspace.snapshot.created");
  }

  return toWorkspaceSnapshotDto(
    {
      id: created.id,
      workspaceId: created.workspaceId,
      ledgerEntryId: ledgerEntry?.id,
      title: created.title,
      summary: created.summary,
      goal: created.goal,
      roleNotes: created.roleNotes,
      projectIds: created.projectIds,
      previousSnapshotId: created.previousSnapshotId,
      previousSnapshotTitle: created.previousSnapshot?.title,
      createdByUserId: created.createdByUserId,
      createdByName: created.createdBy.name,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    },
    selectedProjectIds.map((projectId) => projectMap.get(projectId)).filter(Boolean) as WorkspaceProjectReference[]
  );
}

export async function rollbackWorkspaceSnapshot(params: {
  userId: string;
  workspaceId: string;
  snapshotId: string;
  title?: string;
  summary?: string;
  goal?: string;
  roleNotes?: string;
}): Promise<WorkspaceSnapshot> {
  const workspace = await getAccessibleWorkspace(params.userId, params.workspaceId);
  if (!canRollbackWorkspace(workspace)) {
    throw new RepositoryError("FORBIDDEN", "Only workspace owners or admins can roll back snapshots", 403);
  }

  const source = await getWorkspaceSnapshot({
    userId: params.userId,
    workspaceId: workspace.id,
    snapshotId: params.snapshotId,
  });

  if (!source) {
    throw new RepositoryError("NOT_FOUND", "Snapshot not found", 404);
  }

  return createWorkspaceSnapshot({
    userId: params.userId,
    workspaceId: workspace.id,
    title: params.title?.trim() || `Rollback · ${source.title}`,
    summary: params.summary?.trim() || `Rollback created from ${source.title}.`,
    goal: params.goal?.trim() || source.goal,
    roleNotes: params.roleNotes?.trim() || source.roleNotes,
    projectIds: source.projectIds,
    previousSnapshotId: source.id,
    ledgerActionKind: "workspace.snapshot.rolled_back",
  }).then(async (snapshot) => {
    await appendSnapshotAuditLog(params.userId, "workspace.snapshot.rolled_back", snapshot.id, {
      workspaceId: workspace.id,
      title: snapshot.title,
      sourceSnapshotId: source.id,
      projectIds: source.projectIds,
      teamId: workspace.teamId ?? null,
    });
    return snapshot;
  });
}

export async function listWorkspaceDeliverables(params: {
  userId: string;
  workspaceId: string;
}): Promise<WorkspaceDeliverableListResult> {
  const workspace = await getAccessibleWorkspace(params.userId, params.workspaceId);

  if (useMockData) {
    return {
      items: mockWorkspaceDeliverables
        .filter((deliverable) => deliverable.workspaceId === workspace.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    };
  }

  const db = await getPrisma();
  const rows = await db.workspaceDeliverable.findMany({
    where: { workspaceId: workspace.id },
    include: {
      snapshot: { select: { id: true, title: true } },
      createdBy: { select: { id: true, name: true } },
      reviewedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    items: rows.map((row) =>
      toWorkspaceDeliverableDto({
        id: row.id,
        workspaceId: row.workspaceId,
        snapshotId: row.snapshotId,
        ledgerEntryId: (row as { ledgerEntryId?: string | null }).ledgerEntryId,
        snapshotTitle: row.snapshot.title,
        title: row.title,
        description: row.description,
        status: row.status,
        createdByUserId: row.createdByUserId,
        createdByName: row.createdBy.name,
        reviewedByUserId: row.reviewedByUserId,
        reviewedByName: row.reviewedBy?.name,
        submittedAt: row.submittedAt,
        reviewedAt: row.reviewedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })
    ),
  };
}

export async function createWorkspaceDeliverable(params: {
  userId: string;
  workspaceId: string;
  snapshotId: string;
  title: string;
  description?: string;
}): Promise<WorkspaceDeliverable> {
  const workspace = await getAccessibleWorkspace(params.userId, params.workspaceId);
  const title = params.title.trim();
  const description = params.description?.trim() || undefined;
  if (!title) {
    throw new RepositoryError("INVALID_INPUT", "Deliverable title is required", 400);
  }

  const snapshot = await getWorkspaceSnapshot({
    userId: params.userId,
    workspaceId: workspace.id,
    snapshotId: params.snapshotId,
  });
  if (!snapshot) {
    throw new RepositoryError("NOT_FOUND", "Snapshot not found", 404);
  }

  if (useMockData) {
    const now = new Date().toISOString();
    const createdBy = mockUsers.find((item) => item.id === params.userId);
    const deliverable = toWorkspaceDeliverableDto({
      id: randomUUID(),
      workspaceId: workspace.id,
      snapshotId: snapshot.id,
      ledgerEntryId: undefined,
      snapshotTitle: snapshot.title,
      title,
      description,
      status: "draft",
      createdByUserId: params.userId,
      createdByName: createdBy?.name,
      createdAt: now,
      updatedAt: now,
    });
    mockWorkspaceDeliverables.push(deliverable);
    await appendDeliverableAuditLog(params.userId, "workspace.deliverable.created", deliverable.id, {
      workspaceId: workspace.id,
      snapshotId: snapshot.id,
      title: deliverable.title,
      teamId: workspace.teamId ?? null,
    });
    const ledgerEntry = await appendWorkspaceLedgerEntry({
      workspace,
      actorType: "user",
      actorId: params.userId,
      actionKind: "workspace.deliverable.created",
      targetType: "workspace_deliverable",
      targetId: deliverable.id,
      payload: {
        workspaceId: workspace.id,
        deliverableId: deliverable.id,
        snapshotId: snapshot.id,
        title: deliverable.title,
        status: deliverable.status,
      },
      signedAt: new Date(now),
    });
    if (ledgerEntry) {
      deliverable.ledgerEntryId = ledgerEntry.id;
    }
    if (workspace.ledgerEnabled === false || !isLedgerWriteThroughEnabled()) {
      await enqueueWorkspaceTrustMetricRecompute(params.userId, "workspace.deliverable.created");
    }
    return deliverable;
  }

  const db = await getPrisma();
  const created = await db.workspaceDeliverable.create({
    data: {
      workspaceId: workspace.id,
      snapshotId: snapshot.id,
      createdByUserId: params.userId,
      title,
      description: description ?? null,
    },
    include: {
      snapshot: { select: { id: true, title: true } },
      createdBy: { select: { id: true, name: true } },
      reviewedBy: { select: { id: true, name: true } },
    },
  });

  await appendDeliverableAuditLog(params.userId, "workspace.deliverable.created", created.id, {
    workspaceId: workspace.id,
    snapshotId: snapshot.id,
    title: created.title,
    teamId: workspace.teamId ?? null,
  }, db);
  const ledgerEntry = await appendWorkspaceLedgerEntry({
    workspace,
    actorType: "user",
    actorId: params.userId,
    actionKind: "workspace.deliverable.created",
    targetType: "workspace_deliverable",
    targetId: created.id,
    payload: {
      workspaceId: workspace.id,
      deliverableId: created.id,
      snapshotId: snapshot.id,
      title: created.title,
      status: created.status,
    },
    signedAt: created.createdAt,
    client: db,
  });
  if (ledgerEntry) {
    await db.workspaceDeliverable.update({
      where: { id: created.id },
      data: { ledgerEntry: { connect: { id: ledgerEntry.id } } },
    });
  }
  if (workspace.ledgerEnabled === false || !isLedgerWriteThroughEnabled()) {
    await enqueueWorkspaceTrustMetricRecompute(params.userId, "workspace.deliverable.created");
  }

  return toWorkspaceDeliverableDto({
    id: created.id,
    workspaceId: created.workspaceId,
    snapshotId: created.snapshotId,
    ledgerEntryId: ledgerEntry?.id ?? (created as { ledgerEntryId?: string | null }).ledgerEntryId,
    snapshotTitle: created.snapshot.title,
    title: created.title,
    description: created.description,
    status: created.status,
    createdByUserId: created.createdByUserId,
    createdByName: created.createdBy.name,
    reviewedByUserId: created.reviewedByUserId,
    reviewedByName: created.reviewedBy?.name,
    submittedAt: created.submittedAt,
    reviewedAt: created.reviewedAt,
    createdAt: created.createdAt,
    updatedAt: created.updatedAt,
  });
}

export async function submitWorkspaceDeliverable(params: {
  userId: string;
  workspaceId: string;
  deliverableId: string;
}): Promise<WorkspaceDeliverable> {
  const workspace = await getAccessibleWorkspace(params.userId, params.workspaceId);

  if (useMockData) {
    const item = mockWorkspaceDeliverables.find(
      (deliverable) => deliverable.id === params.deliverableId && deliverable.workspaceId === workspace.id
    );
    if (!item) {
      throw new RepositoryError("NOT_FOUND", "Deliverable not found", 404);
    }
    if (item.createdByUserId !== params.userId && !canReviewWorkspaceDeliverable(workspace, params.userId)) {
      throw new RepositoryError("FORBIDDEN", "You cannot submit this deliverable", 403);
    }
    if (item.status !== "draft") {
      throw new RepositoryError("CONFLICT", "Only draft deliverables can be submitted", 409);
    }
    const now = new Date().toISOString();
    item.status = "submitted";
    item.submittedAt = now;
    item.updatedAt = now;
    await appendDeliverableAuditLog(params.userId, "workspace.deliverable.submitted", item.id, {
      workspaceId: workspace.id,
      snapshotId: item.snapshotId,
      title: item.title,
      teamId: workspace.teamId ?? null,
    });
    await appendWorkspaceLedgerEntry({
      workspace,
      actorType: "user",
      actorId: params.userId,
      actionKind: "workspace.deliverable.submitted",
      targetType: "workspace_deliverable",
      targetId: item.id,
      payload: {
        workspaceId: workspace.id,
        deliverableId: item.id,
        snapshotId: item.snapshotId,
        status: item.status,
      },
      signedAt: new Date(now),
    });
    if (workspace.ledgerEnabled === false || !isLedgerWriteThroughEnabled()) {
      await enqueueWorkspaceTrustMetricRecompute(params.userId, "workspace.deliverable.submitted");
    }
    return item;
  }

  const db = await getPrisma();
  const existing = await db.workspaceDeliverable.findUnique({
    where: { id: params.deliverableId },
    include: {
      snapshot: { select: { title: true } },
      createdBy: { select: { id: true, name: true } },
      reviewedBy: { select: { id: true, name: true } },
    },
  });
  if (!existing || existing.workspaceId !== workspace.id) {
    throw new RepositoryError("NOT_FOUND", "Deliverable not found", 404);
  }
  if (existing.createdByUserId !== params.userId && !canReviewWorkspaceDeliverable(workspace, params.userId)) {
    throw new RepositoryError("FORBIDDEN", "You cannot submit this deliverable", 403);
  }
  if (existing.status !== "draft") {
    throw new RepositoryError("CONFLICT", "Only draft deliverables can be submitted", 409);
  }

  const updated = await db.workspaceDeliverable.update({
    where: { id: existing.id },
    data: {
      status: "submitted",
      submittedAt: new Date(),
      reviewedAt: null,
      reviewedByUserId: null,
    },
    include: {
      snapshot: { select: { title: true } },
      createdBy: { select: { id: true, name: true } },
      reviewedBy: { select: { id: true, name: true } },
    },
  });

  await appendDeliverableAuditLog(params.userId, "workspace.deliverable.submitted", updated.id, {
    workspaceId: workspace.id,
    snapshotId: updated.snapshotId,
    title: updated.title,
    teamId: workspace.teamId ?? null,
  }, db);
  await appendWorkspaceLedgerEntry({
    workspace,
    actorType: "user",
    actorId: params.userId,
    actionKind: "workspace.deliverable.submitted",
    targetType: "workspace_deliverable",
    targetId: updated.id,
    payload: {
      workspaceId: workspace.id,
      deliverableId: updated.id,
      snapshotId: updated.snapshotId,
      status: updated.status,
    },
    signedAt: updated.updatedAt,
    client: db,
  });
  if (workspace.ledgerEnabled === false || !isLedgerWriteThroughEnabled()) {
    await enqueueWorkspaceTrustMetricRecompute(params.userId, "workspace.deliverable.submitted");
  }

  return toWorkspaceDeliverableDto({
    id: updated.id,
    workspaceId: updated.workspaceId,
    snapshotId: updated.snapshotId,
    ledgerEntryId: (updated as { ledgerEntryId?: string | null }).ledgerEntryId,
    snapshotTitle: updated.snapshot.title,
    title: updated.title,
    description: updated.description,
    status: updated.status,
    createdByUserId: updated.createdByUserId,
    createdByName: updated.createdBy.name,
    reviewedByUserId: updated.reviewedByUserId,
    reviewedByName: updated.reviewedBy?.name,
    submittedAt: updated.submittedAt,
    reviewedAt: updated.reviewedAt,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  });
}

export async function reviewWorkspaceDeliverable(params: {
  userId: string;
  workspaceId: string;
  deliverableId: string;
  decision: "approved" | "rejected";
}): Promise<WorkspaceDeliverable> {
  const workspace = await getAccessibleWorkspace(params.userId, params.workspaceId);
  if (!canReviewWorkspaceDeliverable(workspace, params.userId)) {
    throw new RepositoryError("FORBIDDEN", "You cannot review this deliverable", 403);
  }

  if (useMockData) {
    const item = mockWorkspaceDeliverables.find(
      (deliverable) => deliverable.id === params.deliverableId && deliverable.workspaceId === workspace.id
    );
    if (!item) {
      throw new RepositoryError("NOT_FOUND", "Deliverable not found", 404);
    }
    if (item.status !== "submitted") {
      throw new RepositoryError("CONFLICT", "Only submitted deliverables can be reviewed", 409);
    }
    const now = new Date().toISOString();
    const reviewer = mockUsers.find((entry) => entry.id === params.userId);
    item.status = params.decision;
    item.reviewedAt = now;
    item.reviewedByUserId = params.userId;
    item.reviewedByName = reviewer?.name;
    item.updatedAt = now;
    await appendDeliverableAuditLog(params.userId, "workspace.deliverable.reviewed", item.id, {
      workspaceId: workspace.id,
      snapshotId: item.snapshotId,
      title: item.title,
      teamId: workspace.teamId ?? null,
      decision: params.decision,
    });
    await appendWorkspaceLedgerEntry({
      workspace,
      actorType: "user",
      actorId: params.userId,
      actionKind: "workspace.deliverable.reviewed",
      targetType: "workspace_deliverable",
      targetId: item.id,
      payload: {
        workspaceId: workspace.id,
        deliverableId: item.id,
        snapshotId: item.snapshotId,
        status: item.status,
        decision: params.decision,
      },
      signedAt: new Date(now),
    });
    if (workspace.ledgerEnabled === false || !isLedgerWriteThroughEnabled()) {
      await enqueueWorkspaceTrustMetricRecompute(params.userId, "workspace.deliverable.reviewed");
    }
    return item;
  }

  const db = await getPrisma();
  const existing = await db.workspaceDeliverable.findUnique({
    where: { id: params.deliverableId },
    include: {
      snapshot: { select: { title: true } },
      createdBy: { select: { id: true, name: true } },
      reviewedBy: { select: { id: true, name: true } },
    },
  });
  if (!existing || existing.workspaceId !== workspace.id) {
    throw new RepositoryError("NOT_FOUND", "Deliverable not found", 404);
  }
  if (existing.status !== "submitted") {
    throw new RepositoryError("CONFLICT", "Only submitted deliverables can be reviewed", 409);
  }

  const updated = await db.workspaceDeliverable.update({
    where: { id: existing.id },
    data: {
      status: params.decision,
      reviewedAt: new Date(),
      reviewedByUserId: params.userId,
    },
    include: {
      snapshot: { select: { title: true } },
      createdBy: { select: { id: true, name: true } },
      reviewedBy: { select: { id: true, name: true } },
    },
  });

  await appendDeliverableAuditLog(params.userId, "workspace.deliverable.reviewed", updated.id, {
    workspaceId: workspace.id,
    snapshotId: updated.snapshotId,
    title: updated.title,
    teamId: workspace.teamId ?? null,
    decision: params.decision,
  }, db);
  await appendWorkspaceLedgerEntry({
    workspace,
    actorType: "user",
    actorId: params.userId,
    actionKind: "workspace.deliverable.reviewed",
    targetType: "workspace_deliverable",
    targetId: updated.id,
    payload: {
      workspaceId: workspace.id,
      deliverableId: updated.id,
      snapshotId: updated.snapshotId,
      status: updated.status,
      decision: params.decision,
    },
    signedAt: updated.updatedAt,
    client: db,
  });
  if (workspace.ledgerEnabled === false || !isLedgerWriteThroughEnabled()) {
    await enqueueWorkspaceTrustMetricRecompute(params.userId, "workspace.deliverable.reviewed");
  }

  return toWorkspaceDeliverableDto({
    id: updated.id,
    workspaceId: updated.workspaceId,
    snapshotId: updated.snapshotId,
    ledgerEntryId: (updated as { ledgerEntryId?: string | null }).ledgerEntryId,
    snapshotTitle: updated.snapshot.title,
    title: updated.title,
    description: updated.description,
    status: updated.status,
    createdByUserId: updated.createdByUserId,
    createdByName: updated.createdBy.name,
    reviewedByUserId: updated.reviewedByUserId,
    reviewedByName: updated.reviewedBy?.name,
    submittedAt: updated.submittedAt,
    reviewedAt: updated.reviewedAt,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  });
}

export async function listPublicSnapshotsForProject(projectSlug: string): Promise<WorkspaceSnapshot[]> {
  if (useMockData) {
    const project = mockProjects.find((item) => item.slug === projectSlug);
    if (!project?.workspaceId && !project?.teamId) return [];
    const workspaceId = project?.workspaceId ?? (project?.teamId ? `team:${project.teamId}` : undefined);
    if (!workspaceId || !project) return [];
    return mockWorkspaceSnapshots
      .filter((snapshot) => snapshot.workspaceId === workspaceId && snapshot.projectIds.includes(project.id))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  const db = await getPrisma();
  const dbProject = await db.project.findUnique({
    where: { slug: projectSlug },
    select: { id: true, workspaceId: true },
  });
  if (!dbProject?.workspaceId) return [];
  const rows = await db.snapshotCapsule.findMany({
    where: {
      workspaceId: dbProject.workspaceId,
      projectIds: { has: dbProject.id },
    },
    include: {
      createdBy: { select: { id: true, name: true } },
      previousSnapshot: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((row) =>
    toWorkspaceSnapshotDto(
      {
        id: row.id,
        workspaceId: row.workspaceId,
        ledgerEntryId: (row as { ledgerEntryId?: string | null }).ledgerEntryId,
        title: row.title,
        summary: row.summary,
        goal: row.goal,
        roleNotes: row.roleNotes,
        projectIds: row.projectIds,
        previousSnapshotId: row.previousSnapshotId,
        previousSnapshotTitle: row.previousSnapshot?.title,
        createdByUserId: row.createdByUserId,
        createdByName: row.createdBy.name,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
      []
    )
  );
}

export async function getPublicSnapshotForProject(params: {
  projectSlug: string;
  snapshotId: string;
}): Promise<{ project: WorkspaceProjectReference; snapshot: WorkspaceSnapshot } | null> {
  if (useMockData) {
    const project = mockProjects.find((item) => item.slug === params.projectSlug);
    if (!project) return null;
    const snapshot = mockWorkspaceSnapshots.find(
      (item) =>
        item.id === params.snapshotId &&
        item.projectIds.includes(project.id) &&
        (project.workspaceId ? item.workspaceId === project.workspaceId : true)
    );
    if (!snapshot) return null;
    return {
      project: toWorkspaceProjectReference(project),
      snapshot,
    };
  }

  const db = await getPrisma();
  const project = await db.project.findUnique({
    where: { slug: params.projectSlug },
    select: { id: true, slug: true, title: true, openSource: true, workspaceId: true },
  });
  if (!project?.workspaceId) return null;

  const snapshot = await db.snapshotCapsule.findFirst({
    where: {
      id: params.snapshotId,
      workspaceId: project.workspaceId,
      projectIds: { has: project.id },
    },
    include: {
      createdBy: { select: { id: true, name: true } },
      previousSnapshot: { select: { id: true, title: true } },
    },
  });

  if (!snapshot) return null;

  return {
    project: toWorkspaceProjectReference(project),
    snapshot: toWorkspaceSnapshotDto(
      {
        id: snapshot.id,
        workspaceId: snapshot.workspaceId,
        ledgerEntryId: (snapshot as { ledgerEntryId?: string | null }).ledgerEntryId,
        title: snapshot.title,
        summary: snapshot.summary,
        goal: snapshot.goal,
        roleNotes: snapshot.roleNotes,
        projectIds: snapshot.projectIds,
        previousSnapshotId: snapshot.previousSnapshotId,
        previousSnapshotTitle: snapshot.previousSnapshot?.title,
        createdByUserId: snapshot.createdByUserId,
        createdByName: snapshot.createdBy.name,
        createdAt: snapshot.createdAt,
        updatedAt: snapshot.updatedAt,
      },
      [toWorkspaceProjectReference(project)]
    ),
  };
}
