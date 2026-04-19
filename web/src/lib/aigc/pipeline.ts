import { randomUUID } from "crypto";
import type { AigcProviderApi, AigcStamp as AigcStampDto, WorkspaceArtifact } from "@/lib/types";
import {
  mockAigcStamps,
  mockAuditLogs,
  mockTeamMemberships,
  mockTeams,
  mockUsers,
  mockWorkspaceArtifacts,
  mockWorkspacePreferences,
} from "@/lib/data/mock-data";
import { logger, serializeError } from "@/lib/logger";
import { getAigcStampProvider } from "@/lib/aigc/provider";
import { appendEntry, isLedgerWriteThroughEnabled } from "@/lib/repositories/ledger.repository";
import { getPrisma, useMockData } from "@/lib/repositories/repository-shared";
import { RepositoryError } from "@/lib/repository-errors";

export type AigcStampTrigger = "auto" | "manual";

interface StampArtifactParams {
  artifactId: string;
  actorUserId?: string;
  force?: boolean;
  trigger?: AigcStampTrigger;
}

interface PipelineResult {
  artifact: WorkspaceArtifact;
  stamp: AigcStampDto;
}

interface MockWorkspaceContext {
  id: string;
  title: string;
  kind: "personal" | "team";
  ledgerEnabled: boolean;
  aigcAutoStamp: boolean;
  aigcProvider: AigcProviderApi;
}

function resolveMockWorkspaceContext(workspaceId: string): MockWorkspaceContext {
  const override = mockWorkspacePreferences.find((item) => item.workspaceId === workspaceId);
  if (workspaceId.startsWith("personal:")) {
    const userId = workspaceId.slice("personal:".length);
    const user = mockUsers.find((item) => item.id === userId);
    if (!user) {
      throw new RepositoryError("NOT_FOUND", "Workspace not found", 404);
    }
    return {
      id: workspaceId,
      title: "个人工作区",
      kind: "personal",
      ledgerEnabled: override?.ledgerEnabled ?? true,
      aigcAutoStamp: override?.aigcAutoStamp ?? true,
      aigcProvider: override?.aigcProvider ?? "local",
    };
  }

  if (workspaceId.startsWith("team:")) {
    const teamId = workspaceId.slice("team:".length);
    const team = mockTeams.find((item) => item.id === teamId);
    if (!team) {
      throw new RepositoryError("NOT_FOUND", "Workspace not found", 404);
    }
    return {
      id: workspaceId,
      title: team.name,
      kind: "team",
      ledgerEnabled: override?.ledgerEnabled ?? true,
      aigcAutoStamp: override?.aigcAutoStamp ?? true,
      aigcProvider: override?.aigcProvider ?? "local",
    };
  }

  throw new RepositoryError("NOT_FOUND", "Workspace not found", 404);
}

function assertUserCanAccessMockArtifact(userId: string, artifactId: string) {
  const artifact = mockWorkspaceArtifacts.find((item) => item.id === artifactId);
  if (!artifact) {
    throw new RepositoryError("NOT_FOUND", "Workspace artifact not found", 404);
  }
  const workspace = resolveMockWorkspaceContext(artifact.workspaceId);
  if (workspace.kind === "personal") {
    const ownerId = artifact.workspaceId.slice("personal:".length);
    if (ownerId !== userId) {
      throw new RepositoryError("FORBIDDEN", "You do not have access to this artifact", 403);
    }
  } else {
    const teamId = artifact.workspaceId.slice("team:".length);
    const membership = mockTeamMemberships.find((item) => item.teamId === teamId && item.userId === userId);
    if (!membership) {
      throw new RepositoryError("FORBIDDEN", "You do not have access to this artifact", 403);
    }
  }
  return { artifact, workspace };
}

function toStampDto(input: {
  id: string;
  artifactId: string;
  workspaceId: string;
  provider: AigcProviderApi;
  mode: "text" | "image" | "audio" | "video";
  visibleLabel: string;
  hiddenWatermarkId?: string | null;
  stampedAt: string | Date;
  updatedAt: string | Date;
}): AigcStampDto {
  return {
    id: input.id,
    artifactId: input.artifactId,
    workspaceId: input.workspaceId,
    provider: input.provider,
    mode: input.mode,
    visibleLabel: input.visibleLabel,
    hiddenWatermarkId: input.hiddenWatermarkId ?? undefined,
    stampedAt: typeof input.stampedAt === "string" ? input.stampedAt : input.stampedAt.toISOString(),
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : input.updatedAt.toISOString(),
  };
}

function appendMockStampAudit(actorId: string, artifactId: string, metadata: Record<string, unknown>) {
  mockAuditLogs.push({
    id: `audit_${randomUUID()}`,
    actorId,
    action: "aigc.stamp.apply",
    entityType: "workspace_artifact",
    entityId: artifactId,
    metadata,
    createdAt: new Date().toISOString(),
  });
}

async function appendStampLedgerEntry(params: {
  workspaceId: string;
  ledgerEnabled: boolean;
  actorId: string;
  artifactId: string;
  payload: Record<string, unknown>;
  client?: Awaited<ReturnType<typeof getPrisma>>;
}) {
  if (!params.ledgerEnabled || !isLedgerWriteThroughEnabled()) {
    try {
      const { enqueueTrustMetricRecompute } = await import("@/lib/queue/recompute-trust-metric-queue");
      await enqueueTrustMetricRecompute({
        userId: params.actorId,
        reason: "aigc.stamp.apply",
      });
    } catch {
      // Ignore trust metric refresh failures on stamp writes.
    }
    return null;
  }
  return appendEntry({
    workspaceId: params.workspaceId,
    actorType: "user",
    actorId: params.actorId,
    actionKind: "aigc.stamp.apply",
    targetType: "workspace_artifact",
    targetId: params.artifactId,
    payload: params.payload,
    client: params.client,
  });
}

export async function stampArtifact(params: StampArtifactParams): Promise<PipelineResult> {
  const trigger = params.trigger ?? "manual";
  if (useMockData) {
    const artifact = mockWorkspaceArtifacts.find((item) => item.id === params.artifactId);
    if (!artifact) {
      throw new RepositoryError("NOT_FOUND", "Workspace artifact not found", 404);
    }
    const workspace = resolveMockWorkspaceContext(artifact.workspaceId);
    if (trigger === "auto" && (workspace.aigcAutoStamp === false || artifact.requireAigcStamp === false)) {
      const existing = artifact.aigcStampId
        ? mockAigcStamps.find((item) => item.id === artifact.aigcStampId)
        : undefined;
      if (!existing) {
        throw new RepositoryError("CONFLICT", "Artifact does not require automatic AIGC stamping", 409);
      }
      return { artifact, stamp: existing };
    }

    const provider = await getAigcStampProvider(workspace.aigcProvider);
    const providerResult = await provider.applyStamp({
      artifactId: artifact.id,
      workspaceId: workspace.id,
      filename: artifact.filename,
      contentType: artifact.contentType,
      publicUrl: artifact.publicUrl,
    });

    const now = new Date().toISOString();
    let stamp = mockAigcStamps.find((item) => item.artifactId === artifact.id);
    if (stamp) {
      stamp.provider = providerResult.provider;
      stamp.mode = providerResult.mode;
      stamp.visibleLabel = providerResult.visibleLabel;
      stamp.hiddenWatermarkId = providerResult.hiddenWatermarkId;
      stamp.stampedAt = now;
      stamp.updatedAt = now;
    } else {
      stamp = {
        id: randomUUID(),
        artifactId: artifact.id,
        workspaceId: workspace.id,
        provider: providerResult.provider,
        mode: providerResult.mode,
        visibleLabel: providerResult.visibleLabel,
        hiddenWatermarkId: providerResult.hiddenWatermarkId,
        stampedAt: now,
        updatedAt: now,
      };
      mockAigcStamps.push(stamp);
    }
    artifact.aigcStampId = stamp.id;
    artifact.updatedAt = now;
    appendMockStampAudit(params.actorUserId ?? artifact.uploaderUserId, artifact.id, {
      workspaceId: workspace.id,
      provider: stamp.provider,
      mode: stamp.mode,
      trigger,
      stampId: stamp.id,
    });
    await appendStampLedgerEntry({
      workspaceId: workspace.id,
      ledgerEnabled: workspace.ledgerEnabled,
      actorId: params.actorUserId ?? artifact.uploaderUserId,
      artifactId: artifact.id,
      payload: {
        workspaceId: workspace.id,
        artifactId: artifact.id,
        filename: artifact.filename,
        provider: stamp.provider,
        mode: stamp.mode,
        visibleLabel: stamp.visibleLabel,
        hiddenWatermarkId: stamp.hiddenWatermarkId,
        trigger,
      },
    });
    return { artifact, stamp: toStampDto(stamp) };
  }

  const db = await getPrisma();
  const existing = await db.workspaceArtifact.findUnique({
    where: { id: params.artifactId },
    include: {
      workspace: {
        select: {
          id: true,
          title: true,
          ledgerEnabled: true,
          aigcAutoStamp: true,
          aigcProvider: true,
        },
      },
      aigcStamp: true,
      uploader: { select: { id: true, name: true } },
    },
  });
  if (!existing) {
    throw new RepositoryError("NOT_FOUND", "Workspace artifact not found", 404);
  }
  if (trigger === "auto" && (existing.workspace.aigcAutoStamp === false || existing.requireAigcStamp === false)) {
    if (!existing.aigcStamp) {
      throw new RepositoryError("CONFLICT", "Artifact does not require automatic AIGC stamping", 409);
    }
    return {
      artifact: {
        id: existing.id,
        workspaceId: existing.workspaceId,
        aigcStampId: existing.aigcStampId ?? undefined,
        requireAigcStamp: existing.requireAigcStamp,
        filename: existing.filename,
        contentType: existing.contentType,
        sizeBytes: existing.sizeBytes,
        storageKey: existing.storageKey,
        uploaderUserId: existing.uploaderUserId,
        uploaderName: existing.uploader.name,
        visibility: existing.visibility,
        validationState: existing.validationState,
        publicUrl: existing.publicUrl ?? undefined,
        aigcProvider: existing.aigcStamp.provider,
        aigcMode: existing.aigcStamp.mode,
        aigcVisibleLabel: existing.aigcStamp.visibleLabel,
        aigcHiddenWatermarkId: existing.aigcStamp.hiddenWatermarkId ?? undefined,
        aigcStampedAt: existing.aigcStamp.stampedAt.toISOString(),
        createdAt: existing.createdAt.toISOString(),
        updatedAt: existing.updatedAt.toISOString(),
      },
      stamp: toStampDto(existing.aigcStamp),
    };
  }

  const provider = await getAigcStampProvider(existing.workspace.aigcProvider as AigcProviderApi);
  const providerResult = await provider.applyStamp({
    artifactId: existing.id,
    workspaceId: existing.workspaceId,
    filename: existing.filename,
    contentType: existing.contentType,
    publicUrl: existing.publicUrl ?? undefined,
  });

  const result = await db.$transaction(async (tx) => {
    const now = new Date();
    const stamp = existing.aigcStamp
      ? await tx.aigcStamp.update({
          where: { id: existing.aigcStamp.id },
          data: {
            provider: providerResult.provider,
            mode: providerResult.mode,
            visibleLabel: providerResult.visibleLabel,
            hiddenWatermarkId: providerResult.hiddenWatermarkId,
            rawResponse: (providerResult.rawResponse ?? null) as never,
            stampedAt: now,
          },
        })
      : await tx.aigcStamp.create({
          data: {
            artifactId: existing.id,
            workspaceId: existing.workspaceId,
            provider: providerResult.provider,
            mode: providerResult.mode,
            visibleLabel: providerResult.visibleLabel,
            hiddenWatermarkId: providerResult.hiddenWatermarkId,
            rawResponse: (providerResult.rawResponse ?? null) as never,
            stampedAt: now,
          },
        });

    const artifact = await tx.workspaceArtifact.update({
      where: { id: existing.id },
      data: {
        aigcStampId: stamp.id,
      },
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

    await tx.auditLog.create({
      data: {
        actorId: params.actorUserId ?? existing.uploaderUserId,
        action: "aigc.stamp.apply",
        entityType: "workspace_artifact",
        entityId: existing.id,
        metadata: {
          workspaceId: existing.workspaceId,
          provider: stamp.provider,
          mode: stamp.mode,
          trigger,
          stampId: stamp.id,
        } as never,
      },
    });

    await appendStampLedgerEntry({
      workspaceId: existing.workspaceId,
      ledgerEnabled: existing.workspace.ledgerEnabled,
      actorId: params.actorUserId ?? existing.uploaderUserId,
      artifactId: existing.id,
      payload: {
        workspaceId: existing.workspaceId,
        artifactId: existing.id,
        filename: existing.filename,
        provider: stamp.provider,
        mode: stamp.mode,
        visibleLabel: stamp.visibleLabel,
        hiddenWatermarkId: stamp.hiddenWatermarkId,
        trigger,
      },
      client: tx as Awaited<ReturnType<typeof getPrisma>>,
    });

    return { artifact, stamp };
  });

  return {
    artifact: {
      id: result.artifact.id,
      workspaceId: result.artifact.workspaceId,
      aigcStampId: (result.artifact as { aigcStampId?: string | null }).aigcStampId ?? undefined,
      requireAigcStamp: (result.artifact as { requireAigcStamp?: boolean }).requireAigcStamp ?? true,
      filename: result.artifact.filename,
      contentType: result.artifact.contentType,
      sizeBytes: result.artifact.sizeBytes,
      storageKey: result.artifact.storageKey,
      uploaderUserId: result.artifact.uploaderUserId,
      uploaderName: result.artifact.uploader.name,
      visibility: result.artifact.visibility,
      validationState: result.artifact.validationState,
      publicUrl: result.artifact.publicUrl ?? undefined,
      aigcProvider: result.artifact.aigcStamp?.provider,
      aigcMode: result.artifact.aigcStamp?.mode,
      aigcVisibleLabel: result.artifact.aigcStamp?.visibleLabel,
      aigcHiddenWatermarkId: result.artifact.aigcStamp?.hiddenWatermarkId ?? undefined,
      aigcStampedAt: result.artifact.aigcStamp?.stampedAt.toISOString(),
      createdAt: result.artifact.createdAt.toISOString(),
      updatedAt: result.artifact.updatedAt.toISOString(),
    },
    stamp: toStampDto(result.stamp),
  };
}

export async function assertUserCanAccessArtifact(userId: string, artifactId: string): Promise<void> {
  if (useMockData) {
    assertUserCanAccessMockArtifact(userId, artifactId);
    return;
  }
  const db = await getPrisma();
  const artifact = await db.workspaceArtifact.findUnique({
    where: { id: artifactId },
    include: {
      workspace: {
        select: {
          userId: true,
          team: {
            select: {
              memberships: {
                where: { userId },
                select: { id: true },
                take: 1,
              },
            },
          },
        },
      },
    },
  });
  if (!artifact) {
    throw new RepositoryError("NOT_FOUND", "Workspace artifact not found", 404);
  }
  if (artifact.workspace.userId === userId || artifact.workspace.team?.memberships.length) {
    return;
  }
  throw new RepositoryError("FORBIDDEN", "You do not have access to this artifact", 403);
}

export async function runAigcStampPipeline(params: StampArtifactParams): Promise<PipelineResult> {
  try {
    return await stampArtifact(params);
  } catch (error) {
    logger.error({ err: serializeError(error), artifactId: params.artifactId }, "AIGC stamp pipeline failed");
    throw error;
  }
}
