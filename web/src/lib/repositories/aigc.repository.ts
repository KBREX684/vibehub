import type { AigcComplianceAuditTrailItem, AigcComplianceSettings, AigcProviderApi } from "@/lib/types";
import {
  mockAigcStamps,
  mockWorkspaceArtifacts,
  mockWorkspacePreferences,
} from "@/lib/data/mock-data";
import { RepositoryError } from "@/lib/repository-errors";
import { getPrisma, useMockData } from "@/lib/repositories/repository-shared";
import { ensurePersonalWorkspace, listAccessibleWorkspacesForUser } from "@/lib/repositories/workspace.repository";
import { assertUserCanAccessArtifact, runAigcStampPipeline } from "@/lib/aigc/pipeline";

function parseMonthRange(month?: string) {
  if (!month) return null;
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new RepositoryError("INVALID_INPUT", "Month must use YYYY-MM format", 400);
  }
  const start = new Date(`${month}-01T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) {
    throw new RepositoryError("INVALID_INPUT", "Month must use YYYY-MM format", 400);
  }
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return { start, end };
}

export async function getComplianceSettings(userId: string): Promise<AigcComplianceSettings> {
  const workspace = await ensurePersonalWorkspace(userId);
  return {
    workspaceId: workspace.id,
    aigcAutoStamp: workspace.aigcAutoStamp ?? true,
    aigcProvider: workspace.aigcProvider ?? "local",
    ledgerEnabled: workspace.ledgerEnabled ?? true,
  };
}

export async function updateComplianceSettings(params: {
  userId: string;
  aigcAutoStamp?: boolean;
  aigcProvider?: AigcProviderApi;
  ledgerEnabled?: boolean;
}): Promise<AigcComplianceSettings> {
  const workspace = await ensurePersonalWorkspace(params.userId);
  if (useMockData) {
    const existing = mockWorkspacePreferences.find((item) => item.workspaceId === workspace.id);
    if (existing) {
      if (typeof params.aigcAutoStamp === "boolean") existing.aigcAutoStamp = params.aigcAutoStamp;
      if (params.aigcProvider) existing.aigcProvider = params.aigcProvider;
      if (typeof params.ledgerEnabled === "boolean") existing.ledgerEnabled = params.ledgerEnabled;
    } else {
      mockWorkspacePreferences.push({
        workspaceId: workspace.id,
        aigcAutoStamp: params.aigcAutoStamp ?? workspace.aigcAutoStamp ?? true,
        aigcProvider: params.aigcProvider ?? workspace.aigcProvider ?? "local",
        ledgerEnabled: params.ledgerEnabled ?? workspace.ledgerEnabled ?? true,
      });
    }
    return getComplianceSettings(params.userId);
  }

  const db = await getPrisma();
  await db.workspace.update({
    where: { id: workspace.id },
    data: {
      ...(typeof params.aigcAutoStamp === "boolean" ? { aigcAutoStamp: params.aigcAutoStamp } : {}),
      ...(params.aigcProvider ? { aigcProvider: params.aigcProvider } : {}),
      ...(typeof params.ledgerEnabled === "boolean" ? { ledgerEnabled: params.ledgerEnabled } : {}),
    },
  });
  return getComplianceSettings(params.userId);
}

export async function listAigcComplianceAuditTrail(params: {
  userId: string;
  month?: string;
}): Promise<{ items: AigcComplianceAuditTrailItem[] }> {
  const workspaces = await listAccessibleWorkspacesForUser(params.userId);
  const workspaceById = new Map(workspaces.map((item) => [item.id, item]));
  const workspaceIds = [...workspaceById.keys()];
  const range = parseMonthRange(params.month);

  if (useMockData) {
    const items = mockAigcStamps
      .filter((stamp) => workspaceById.has(stamp.workspaceId))
      .filter((stamp) => {
        if (!range) return true;
        const stampedAt = new Date(stamp.stampedAt);
        return stampedAt >= range.start && stampedAt < range.end;
      })
      .sort((a, b) => b.stampedAt.localeCompare(a.stampedAt))
      .map((stamp) => {
        const workspace = workspaceById.get(stamp.workspaceId);
        const artifact = mockWorkspaceArtifacts.find((item) => item.id === stamp.artifactId);
        return {
          stampId: stamp.id,
          artifactId: stamp.artifactId,
          workspaceId: stamp.workspaceId,
          workspaceTitle: workspace?.title ?? "工作区",
          workspaceKind: workspace?.kind ?? "personal",
          filename: artifact?.filename ?? "未命名文件",
          provider: stamp.provider,
          mode: stamp.mode,
          visibleLabel: stamp.visibleLabel,
          hiddenWatermarkId: stamp.hiddenWatermarkId,
          stampedAt: stamp.stampedAt,
        };
      });
    return { items };
  }

  const db = await getPrisma();
  const rows = await db.aigcStamp.findMany({
    where: {
      workspaceId: { in: workspaceIds },
      ...(range
        ? {
            stampedAt: {
              gte: range.start,
              lt: range.end,
            },
          }
        : {}),
    },
    include: {
      artifact: { select: { filename: true } },
      workspace: { select: { id: true, title: true, kind: true } },
    },
    orderBy: { stampedAt: "desc" },
  });

  return {
    items: rows.map((row) => ({
      stampId: row.id,
      artifactId: row.artifactId,
      workspaceId: row.workspaceId,
      workspaceTitle: row.workspace.title,
      workspaceKind: row.workspace.kind,
      filename: row.artifact.filename,
      provider: row.provider as AigcProviderApi,
      mode: row.mode,
      visibleLabel: row.visibleLabel,
      hiddenWatermarkId: row.hiddenWatermarkId ?? undefined,
      stampedAt: row.stampedAt.toISOString(),
    })),
  };
}

export async function stampArtifactForUser(params: {
  userId: string;
  artifactId: string;
  force?: boolean;
}) {
  await assertUserCanAccessArtifact(params.userId, params.artifactId);
  return runAigcStampPipeline({
    artifactId: params.artifactId,
    actorUserId: params.userId,
    force: params.force,
    trigger: "manual",
  });
}
