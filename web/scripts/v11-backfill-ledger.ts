import { prisma } from "@/lib/db";
import { appendEntry } from "@/lib/repositories/ledger.repository";
import { hasDatabaseUrlConfigured, isMockDataEnabled } from "@/lib/runtime-mode";

type SourceKind = "agent_action_audit" | "agent_confirmation_request" | "workspace_snapshot" | "workspace_deliverable";

interface BackfillItem {
  source: SourceKind;
  sourceId: string;
  workspaceId: string;
  signedAt: Date;
  run: () => Promise<void>;
}

interface Counters {
  scanned: number;
  matchedWorkspace: number;
  alreadyLinked: number;
  skippedMissingWorkspace: number;
  pendingWrite: number;
  written: number;
  failed: number;
}

const counters: Record<SourceKind, Counters> = {
  agent_action_audit: { scanned: 0, matchedWorkspace: 0, alreadyLinked: 0, skippedMissingWorkspace: 0, pendingWrite: 0, written: 0, failed: 0 },
  agent_confirmation_request: { scanned: 0, matchedWorkspace: 0, alreadyLinked: 0, skippedMissingWorkspace: 0, pendingWrite: 0, written: 0, failed: 0 },
  workspace_snapshot: { scanned: 0, matchedWorkspace: 0, alreadyLinked: 0, skippedMissingWorkspace: 0, pendingWrite: 0, written: 0, failed: 0 },
  workspace_deliverable: { scanned: 0, matchedWorkspace: 0, alreadyLinked: 0, skippedMissingWorkspace: 0, pendingWrite: 0, written: 0, failed: 0 },
};

function usage(): never {
  console.error("Usage: npm run v11:backfill-ledger -- [--dry-run] [--workspace=<workspaceId>]");
  process.exit(1);
}

function parseArgs() {
  const workspaceArg = process.argv.find((arg) => arg.startsWith("--workspace="));
  const help = process.argv.includes("--help") || process.argv.includes("-h");
  if (help) usage();
  return {
    dryRun: !process.argv.includes("--apply"),
    workspaceId: workspaceArg ? workspaceArg.slice("--workspace=".length).trim() || undefined : undefined,
  };
}

function sortItems(items: BackfillItem[]) {
  return items.sort((a, b) => {
    const diff = a.signedAt.getTime() - b.signedAt.getTime();
    if (diff !== 0) return diff;
    return `${a.source}:${a.sourceId}`.localeCompare(`${b.source}:${b.sourceId}`);
  });
}

async function loadTeamWorkspaceMap(filterWorkspaceId?: string) {
  const rows = await prisma.workspace.findMany({
    where: { kind: "team", ...(filterWorkspaceId ? { id: filterWorkspaceId } : {}) },
    select: { id: true, teamId: true },
  });
  const map = new Map<string, string>();
  for (const row of rows) {
    if (row.teamId) {
      map.set(row.teamId, row.id);
    }
  }
  return map;
}

function maybeWorkspaceIdFromPayload(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return undefined;
  }
  const workspaceId = (payload as Record<string, unknown>).workspaceId;
  return typeof workspaceId === "string" && workspaceId.trim() ? workspaceId.trim() : undefined;
}

async function collectAgentActionAudits(teamWorkspaceIds: Map<string, string>, filterWorkspaceId?: string) {
  const rows = await prisma.agentActionAudit.findMany({
    where: {
      ...(filterWorkspaceId
        ? {
            OR: [
              { metadata: { path: ["workspaceId"], equals: filterWorkspaceId } },
              {
                teamId: {
                  in: Array.from(teamWorkspaceIds.entries())
                    .filter(([, workspaceId]) => workspaceId === filterWorkspaceId)
                    .map(([teamId]) => teamId),
                },
              },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      actorUserId: true,
      agentBindingId: true,
      apiKeyId: true,
      teamId: true,
      taskId: true,
      ledgerEntryId: true,
      action: true,
      outcome: true,
      metadata: true,
      createdAt: true,
    },
  });

  const items: BackfillItem[] = [];
  for (const row of rows) {
    counters.agent_action_audit.scanned += 1;
    if (row.ledgerEntryId) {
      counters.agent_action_audit.alreadyLinked += 1;
      continue;
    }
    const workspaceId = maybeWorkspaceIdFromPayload(row.metadata) ?? (row.teamId ? teamWorkspaceIds.get(row.teamId) : undefined);
    if (!workspaceId) {
      counters.agent_action_audit.skippedMissingWorkspace += 1;
      continue;
    }
    counters.agent_action_audit.matchedWorkspace += 1;
    counters.agent_action_audit.pendingWrite += 1;
    items.push({
      source: "agent_action_audit",
      sourceId: row.id,
      workspaceId,
      signedAt: row.createdAt,
      run: async () => {
        const ledgerEntry = await appendEntry({
          workspaceId,
          actorType: "agent",
          actorId: row.agentBindingId,
          actionKind: `agent.action.${row.action}`,
          targetType: row.taskId ? "team_task" : row.teamId ? "team" : undefined,
          targetId: row.taskId ?? row.teamId ?? undefined,
          payload: {
            actorUserId: row.actorUserId,
            apiKeyId: row.apiKeyId ?? null,
            teamId: row.teamId ?? null,
            taskId: row.taskId ?? null,
            outcome: row.outcome,
            metadata:
              row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
                ? (row.metadata as Record<string, unknown>)
                : {},
          },
          signedAt: row.createdAt,
          client: prisma,
        });
        await prisma.agentActionAudit.update({
          where: { id: row.id },
          data: { ledgerEntry: { connect: { id: ledgerEntry.id } } },
        });
      },
    });
  }
  return items;
}

async function collectAgentConfirmationRequests(teamWorkspaceIds: Map<string, string>, filterWorkspaceId?: string) {
  const rows = await prisma.agentConfirmationRequest.findMany({
    where: {
      ...(filterWorkspaceId
        ? {
            OR: [
              { payload: { path: ["workspaceId"], equals: filterWorkspaceId } },
              {
                teamId: {
                  in: Array.from(teamWorkspaceIds.entries())
                    .filter(([, workspaceId]) => workspaceId === filterWorkspaceId)
                    .map(([teamId]) => teamId),
                },
              },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      requesterUserId: true,
      agentBindingId: true,
      apiKeyId: true,
      teamId: true,
      taskId: true,
      ledgerEntryId: true,
      targetType: true,
      targetId: true,
      action: true,
      reason: true,
      payload: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  const items: BackfillItem[] = [];
  for (const row of rows) {
    counters.agent_confirmation_request.scanned += 1;
    if (row.ledgerEntryId) {
      counters.agent_confirmation_request.alreadyLinked += 1;
      continue;
    }
    const workspaceId = maybeWorkspaceIdFromPayload(row.payload) ?? (row.teamId ? teamWorkspaceIds.get(row.teamId) : undefined);
    if (!workspaceId) {
      counters.agent_confirmation_request.skippedMissingWorkspace += 1;
      continue;
    }
    counters.agent_confirmation_request.matchedWorkspace += 1;
    counters.agent_confirmation_request.pendingWrite += 1;
    items.push({
      source: "agent_confirmation_request",
      sourceId: row.id,
      workspaceId,
      signedAt: row.createdAt,
      run: async () => {
        const ledgerEntry = await appendEntry({
          workspaceId,
          actorType: "agent",
          actorId: row.agentBindingId,
          actionKind: "agent.confirmation.requested",
          targetType: row.targetType,
          targetId: row.targetId,
          payload: {
            requesterUserId: row.requesterUserId,
            apiKeyId: row.apiKeyId ?? null,
            teamId: row.teamId ?? null,
            taskId: row.taskId ?? null,
            action: row.action,
            reason: row.reason ?? null,
            payload:
              row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
                ? (row.payload as Record<string, unknown>)
                : {},
            expiresAt: row.expiresAt?.toISOString() ?? null,
          },
          signedAt: row.createdAt,
          client: prisma,
        });
        await prisma.agentConfirmationRequest.update({
          where: { id: row.id },
          data: { ledgerEntry: { connect: { id: ledgerEntry.id } } },
        });
      },
    });
  }
  return items;
}

async function collectWorkspaceSnapshots(filterWorkspaceId?: string) {
  const rows = await prisma.snapshotCapsule.findMany({
    where: {
      ledgerEntryId: null,
      ...(filterWorkspaceId ? { workspaceId: filterWorkspaceId } : {}),
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      workspaceId: true,
      createdByUserId: true,
      title: true,
      summary: true,
      goal: true,
      roleNotes: true,
      projectIds: true,
      previousSnapshotId: true,
      createdAt: true,
    },
  });

  return rows.map<BackfillItem>((row) => {
    counters.workspace_snapshot.scanned += 1;
    counters.workspace_snapshot.matchedWorkspace += 1;
    counters.workspace_snapshot.pendingWrite += 1;
    return {
      source: "workspace_snapshot",
      sourceId: row.id,
      workspaceId: row.workspaceId,
      signedAt: row.createdAt,
      run: async () => {
        const ledgerEntry = await appendEntry({
          workspaceId: row.workspaceId,
          actorType: "user",
          actorId: row.createdByUserId,
          actionKind: "workspace.snapshot.created",
          targetType: "workspace_snapshot",
          targetId: row.id,
          payload: {
            workspaceId: row.workspaceId,
            snapshotId: row.id,
            title: row.title,
            summary: row.summary,
            goal: row.goal ?? null,
            roleNotes: row.roleNotes ?? null,
            projectIds: row.projectIds,
            previousSnapshotId: row.previousSnapshotId ?? null,
          },
          signedAt: row.createdAt,
          client: prisma,
        });
        await prisma.snapshotCapsule.update({
          where: { id: row.id },
          data: { ledgerEntry: { connect: { id: ledgerEntry.id } } },
        });
      },
    };
  });
}

async function collectWorkspaceDeliverables(filterWorkspaceId?: string) {
  const rows = await prisma.workspaceDeliverable.findMany({
    where: {
      ledgerEntryId: null,
      ...(filterWorkspaceId ? { workspaceId: filterWorkspaceId } : {}),
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      workspaceId: true,
      snapshotId: true,
      createdByUserId: true,
      reviewedByUserId: true,
      title: true,
      description: true,
      status: true,
      submittedAt: true,
      reviewedAt: true,
      createdAt: true,
    },
  });

  return rows.map<BackfillItem>((row) => {
    counters.workspace_deliverable.scanned += 1;
    counters.workspace_deliverable.matchedWorkspace += 1;
    counters.workspace_deliverable.pendingWrite += 1;
    return {
      source: "workspace_deliverable",
      sourceId: row.id,
      workspaceId: row.workspaceId,
      signedAt: row.createdAt,
      run: async () => {
        const ledgerEntry = await appendEntry({
          workspaceId: row.workspaceId,
          actorType: "user",
          actorId: row.createdByUserId,
          actionKind: "workspace.deliverable.created",
          targetType: "workspace_deliverable",
          targetId: row.id,
          payload: {
            workspaceId: row.workspaceId,
            deliverableId: row.id,
            snapshotId: row.snapshotId,
            title: row.title,
            description: row.description ?? null,
            status: row.status,
            submittedAt: row.submittedAt?.toISOString() ?? null,
            reviewedAt: row.reviewedAt?.toISOString() ?? null,
            reviewedByUserId: row.reviewedByUserId ?? null,
          },
          signedAt: row.createdAt,
          client: prisma,
        });
        await prisma.workspaceDeliverable.update({
          where: { id: row.id },
          data: { ledgerEntry: { connect: { id: ledgerEntry.id } } },
        });
      },
    };
  });
}

async function main() {
  const { dryRun, workspaceId } = parseArgs();

  if (isMockDataEnabled()) {
    throw new Error("V11_BACKFILL_REQUIRES_DATABASE_MODE");
  }
  if (!hasDatabaseUrlConfigured()) {
    throw new Error("DATABASE_URL_REQUIRED");
  }

  const teamWorkspaceIds = await loadTeamWorkspaceMap(workspaceId);
  const items = sortItems([
    ...(await collectAgentActionAudits(teamWorkspaceIds, workspaceId)),
    ...(await collectAgentConfirmationRequests(teamWorkspaceIds, workspaceId)),
    ...(await collectWorkspaceSnapshots(workspaceId)),
    ...(await collectWorkspaceDeliverables(workspaceId)),
  ]);

  if (!dryRun) {
    for (const item of items) {
      try {
        await item.run();
        counters[item.source].written += 1;
      } catch (error) {
        counters[item.source].failed += 1;
        // eslint-disable-next-line no-console -- CLI script
        console.error(`[${item.source}] failed for ${item.sourceId}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  // eslint-disable-next-line no-console -- CLI script
  console.log(
    JSON.stringify(
      {
        ok: true,
        mode: dryRun ? "dry-run" : "apply",
        workspaceId: workspaceId ?? null,
        totalPendingWrites: items.length,
        counters,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console -- CLI script
    console.error(
      JSON.stringify(
        {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        },
        null,
        2
      )
    );
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
