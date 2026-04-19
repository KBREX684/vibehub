import { randomUUID } from "crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { mockLedgerEntries, mockTeams, mockTeamMemberships } from "@/lib/data/mock-data";
import { mockCreators, mockLegalAttestationLinks } from "@/lib/data/mock-data";
import type { LedgerEntry, TeamRole, WorkspaceKind } from "@/lib/types";
import {
  composeSigningMessage,
  computePayloadHash,
  verifyBundle as verifyLedgerBundle,
  verifyEntry,
} from "@/lib/ledger/hash-chain";
import { publicKey, sign } from "@/lib/ledger/signer";
import { RepositoryError } from "@/lib/repository-errors";
import { getPrisma, useMockData } from "@/lib/repositories/repository-shared";
import {
  anchorLedgerBundle,
  type LegalAnchorProvider,
} from "@/lib/legal-anchor/provider";
import { computeLedgerBundleHash } from "@/lib/ledger/export-utils";

type DbClient = Prisma.TransactionClient | PrismaClient;

interface CursorShape {
  signedAt: string;
  id: string;
}

export interface LedgerListParams {
  workspaceId?: string;
  from?: Date;
  to?: Date;
  actor?: string;
  kind?: string;
  cursor?: string;
  limit?: number;
}

export interface LedgerListResult {
  items: LedgerEntry[];
  cursor: string | null;
}

export interface LedgerBundle {
  signedBy: "vibehub-signer-v1";
  publicKey: string;
  entries: LedgerEntry[];
}

export interface AnchorWorkspaceLedgerResult {
  provider: LegalAnchorProvider;
  workspaceId: string;
  entryCount: number;
  bundleHash: string;
  txId: string;
  href: string;
  verifiedAt: string;
  attestationLinkId?: string;
  ledgerEntryId: string;
}

export function isLedgerWriteThroughEnabled() {
  return process.env.V11_LEDGER_WRITE_THROUGH !== "false";
}

function encodeCursor(cursor: CursorShape | null) {
  if (!cursor) return null;
  return Buffer.from(JSON.stringify(cursor), "utf-8").toString("base64url");
}

function decodeCursor(cursor?: string | null): CursorShape | null {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf-8")) as CursorShape;
    if (!parsed?.signedAt || !parsed?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

function toIso(value: Date | string) {
  return typeof value === "string" ? value : value.toISOString();
}

function normalizeLedgerEntry(row: {
  id: string;
  workspaceId: string;
  actorType: "user" | "agent";
  actorId: string;
  actionKind: string;
  targetType?: string | null;
  targetId?: string | null;
  payload: unknown;
  payloadHash: string;
  prevHash?: string | null;
  signature: string;
  signedAt: Date | string;
  anchorChain: "vibehub" | "zhixin" | "baoquan";
  anchorTxId?: string | null;
  anchorVerifiedAt?: Date | string | null;
}): LedgerEntry {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    actorType: row.actorType,
    actorId: row.actorId,
    actionKind: row.actionKind,
    targetType: row.targetType ?? undefined,
    targetId: row.targetId ?? undefined,
    payload:
      row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
        ? (row.payload as Record<string, unknown>)
        : {},
    payloadHash: row.payloadHash,
    prevHash: row.prevHash ?? undefined,
    signature: row.signature,
    signedAt: toIso(row.signedAt),
    anchorChain: row.anchorChain,
    anchorTxId: row.anchorTxId ?? undefined,
    anchorVerifiedAt: row.anchorVerifiedAt ? toIso(row.anchorVerifiedAt) : undefined,
  };
}

function compareDesc(a: LedgerEntry, b: LedgerEntry) {
  if (a.signedAt === b.signedAt) {
    return a.id < b.id ? 1 : -1;
  }
  return a.signedAt < b.signedAt ? 1 : -1;
}

function compareAsc(a: LedgerEntry, b: LedgerEntry) {
  if (a.signedAt === b.signedAt) {
    return a.id > b.id ? 1 : -1;
  }
  return a.signedAt > b.signedAt ? 1 : -1;
}

function applyCursorFilter(items: LedgerEntry[], cursor?: string | null) {
  const decoded = decodeCursor(cursor);
  if (!decoded) return items;
  return items.filter((item) => {
    if (item.signedAt < decoded.signedAt) return true;
    if (item.signedAt > decoded.signedAt) return false;
    return item.id < decoded.id;
  });
}

async function enqueueTrustMetricRecomputeSafe(userId: string, reason: string) {
  try {
    const { enqueueTrustMetricRecompute } = await import("@/lib/queue/recompute-trust-metric-queue");
    await enqueueTrustMetricRecompute({ userId, reason });
  } catch {
    // Ignore trust metric refresh failures on write paths.
  }
}

function isWorkspaceOwnerLike(kind: WorkspaceKind, viewerRole?: TeamRole) {
  if (kind === "personal") return true;
  return viewerRole === "owner" || viewerRole === "admin";
}

async function assertReadableWorkspaceForUser(userId: string, workspaceId: string, ownerOnly: boolean) {
  if (useMockData) {
    const personalId = `personal:${userId}`;
    if (workspaceId === personalId) {
      return { id: personalId, kind: "personal" as const };
    }
    const team = mockTeams.find((item) => `team:${item.id}` === workspaceId);
    if (!team) {
      throw new RepositoryError("FORBIDDEN", "You do not have access to this ledger", 403);
    }
    const membership = mockTeamMemberships.find((item) => item.teamId === team.id && item.userId === userId);
    if (!membership) {
      throw new RepositoryError("FORBIDDEN", "You do not have access to this ledger", 403);
    }
    if (ownerOnly && !isWorkspaceOwnerLike("team", membership.role)) {
      throw new RepositoryError("FORBIDDEN", "Only workspace owners can view this ledger", 403);
    }
    return { id: workspaceId, kind: "team" as const };
  }

  const db = await getPrisma();
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      team: {
        select: {
          memberships: {
            where: { userId },
            select: { role: true },
            take: 1,
          },
        },
      },
    },
  });
  if (!workspace) {
    throw new RepositoryError("FORBIDDEN", "You do not have access to this ledger", 403);
  }
  if (workspace.kind === "personal") {
    if (workspace.userId !== userId) {
      throw new RepositoryError("FORBIDDEN", "You do not have access to this ledger", 403);
    }
    return { id: workspace.id, kind: "personal" as const };
  }
  const membership = workspace.team?.memberships[0];
  if (!membership) {
    throw new RepositoryError("FORBIDDEN", "You do not have access to this ledger", 403);
  }
  if (ownerOnly && !isWorkspaceOwnerLike("team", membership.role)) {
    throw new RepositoryError("FORBIDDEN", "Only workspace owners can view this ledger", 403);
  }
  return { id: workspace.id, kind: "team" as const };
}

async function resolveWorkspaceIdsForUser(userId: string, workspaceId?: string) {
  if (useMockData) {
    const workspaceIds = [
      `personal:${userId}`,
      ...mockTeamMemberships
        .filter((item) => item.userId === userId)
        .map((item) => `team:${item.teamId}`),
    ];
    if (workspaceId && !workspaceIds.includes(workspaceId)) {
      throw new RepositoryError("FORBIDDEN", "You do not have access to this ledger", 403);
    }
    return workspaceId ? [workspaceId] : workspaceIds;
  }

  const db = await getPrisma();
  const [personal, teamRows] = await Promise.all([
    db.workspace.findFirst({
      where: { kind: "personal", userId },
      select: { id: true },
    }),
    db.workspace.findMany({
      where: { team: { memberships: { some: { userId } } } },
      select: { id: true },
    }),
  ]);
  const workspaceIds = [...(personal ? [personal.id] : []), ...teamRows.map((item) => item.id)];
  if (workspaceId && !workspaceIds.includes(workspaceId)) {
    throw new RepositoryError("FORBIDDEN", "You do not have access to this ledger", 403);
  }
  return workspaceId ? [workspaceId] : workspaceIds;
}

function filterEntries(entries: LedgerEntry[], params: LedgerListParams) {
  return entries
    .filter((entry) => !params.workspaceId || entry.workspaceId === params.workspaceId)
    .filter((entry) => !params.actor || entry.actorId === params.actor)
    .filter((entry) => !params.kind || entry.actionKind === params.kind)
    .filter((entry) => !params.from || entry.signedAt >= params.from.toISOString())
    .filter((entry) => !params.to || entry.signedAt <= params.to.toISOString());
}

export async function appendEntry(params: {
  workspaceId: string;
  actorType: "user" | "agent";
  actorId: string;
  actionKind: string;
  targetType?: string;
  targetId?: string;
  payload: Record<string, unknown>;
  signedAt?: Date;
  client?: DbClient;
}): Promise<LedgerEntry> {
  const payloadHash = computePayloadHash(params.payload);
  if (useMockData) {
    const previous = mockLedgerEntries
      .filter((entry) => entry.workspaceId === params.workspaceId)
      .sort(compareDesc)[0];
    const prevHash = previous?.signature;
    const entry: LedgerEntry = {
      id: randomUUID(),
      workspaceId: params.workspaceId,
      actorType: params.actorType,
      actorId: params.actorId,
      actionKind: params.actionKind,
      targetType: params.targetType,
      targetId: params.targetId,
      payload: params.payload,
      payloadHash,
      prevHash,
      signature: sign(composeSigningMessage(payloadHash, prevHash)),
      signedAt: (params.signedAt ?? new Date()).toISOString(),
      anchorChain: "vibehub",
    };
    mockLedgerEntries.push(entry);
    if (params.actorType === "user") {
      await enqueueTrustMetricRecomputeSafe(params.actorId, params.actionKind);
    }
    return entry;
  }

  const db = params.client ?? (await getPrisma());
  const previous = await db.ledgerEntry.findFirst({
    where: { workspaceId: params.workspaceId },
    orderBy: [{ signedAt: "desc" }, { id: "desc" }],
  });
  const prevHash = previous?.signature ?? null;
  const signature = sign(composeSigningMessage(payloadHash, prevHash));
  const created = await db.ledgerEntry.create({
    data: {
      workspaceId: params.workspaceId,
      actorType: params.actorType,
      actorId: params.actorId,
      actionKind: params.actionKind,
      targetType: params.targetType ?? null,
      targetId: params.targetId ?? null,
      payload: params.payload as Prisma.InputJsonValue,
      payloadHash,
      prevHash,
      signature,
      signedAt: params.signedAt ?? new Date(),
      anchorChain: "vibehub",
    },
  });
  const normalized = normalizeLedgerEntry(created);
  if (params.actorType === "user") {
    await enqueueTrustMetricRecomputeSafe(params.actorId, params.actionKind);
  }
  return normalized;
}

export async function listByWorkspace(params: {
  userId: string;
  workspaceId: string;
  from?: Date;
  to?: Date;
  actor?: string;
  kind?: string;
  cursor?: string;
  limit?: number;
}): Promise<LedgerListResult> {
  await assertReadableWorkspaceForUser(params.userId, params.workspaceId, true);
  const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);

  if (useMockData) {
    const filtered = applyCursorFilter(
      filterEntries(
        [...mockLedgerEntries].sort(compareDesc),
        {
          workspaceId: params.workspaceId,
          from: params.from,
          to: params.to,
          actor: params.actor,
          kind: params.kind,
        }
      ),
      params.cursor
    );
    const items = filtered.slice(0, limit);
    const next = filtered[limit];
    return { items, cursor: next ? encodeCursor({ signedAt: next.signedAt, id: next.id }) : null };
  }

  const db = await getPrisma();
  const decoded = decodeCursor(params.cursor);
  const rows = await db.ledgerEntry.findMany({
    where: {
      workspaceId: params.workspaceId,
      actorId: params.actor ?? undefined,
      actionKind: params.kind ?? undefined,
      signedAt: {
        gte: params.from,
        lte: params.to,
      },
      ...(decoded
        ? {
            OR: [
              { signedAt: { lt: new Date(decoded.signedAt) } },
              { signedAt: new Date(decoded.signedAt), id: { lt: decoded.id } },
            ],
          }
        : {}),
    },
    orderBy: [{ signedAt: "desc" }, { id: "desc" }],
    take: limit + 1,
  });
  const normalized = rows.map(normalizeLedgerEntry);
  const items = normalized.slice(0, limit);
  const next = normalized[limit];
  return { items, cursor: next ? encodeCursor({ signedAt: next.signedAt, id: next.id }) : null };
}

export async function listByUser(params: {
  userId: string;
  workspaceId?: string;
  from?: Date;
  to?: Date;
  actor?: string;
  kind?: string;
  cursor?: string;
  limit?: number;
}): Promise<LedgerListResult> {
  const workspaceIds = await resolveWorkspaceIdsForUser(params.userId, params.workspaceId);
  const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);

  if (useMockData) {
    const filtered = applyCursorFilter(
      filterEntries(
        [...mockLedgerEntries]
          .filter((entry) => workspaceIds.includes(entry.workspaceId))
          .sort(compareDesc),
        {
          workspaceId: undefined,
          from: params.from,
          to: params.to,
          actor: params.actor,
          kind: params.kind,
        }
      ),
      params.cursor
    );
    const items = filtered.slice(0, limit);
    const next = filtered[limit];
    return { items, cursor: next ? encodeCursor({ signedAt: next.signedAt, id: next.id }) : null };
  }

  const db = await getPrisma();
  const decoded = decodeCursor(params.cursor);
  const rows = await db.ledgerEntry.findMany({
    where: {
      workspaceId: { in: workspaceIds },
      actorId: params.actor ?? undefined,
      actionKind: params.kind ?? undefined,
      signedAt: {
        gte: params.from,
        lte: params.to,
      },
      ...(decoded
        ? {
            OR: [
              { signedAt: { lt: new Date(decoded.signedAt) } },
              { signedAt: new Date(decoded.signedAt), id: { lt: decoded.id } },
            ],
          }
        : {}),
    },
    orderBy: [{ signedAt: "desc" }, { id: "desc" }],
    take: limit + 1,
  });
  const normalized = rows.map(normalizeLedgerEntry);
  const items = normalized.slice(0, limit);
  const next = normalized[limit];
  return { items, cursor: next ? encodeCursor({ signedAt: next.signedAt, id: next.id }) : null };
}

export async function getById(id: string): Promise<LedgerEntry | null> {
  if (useMockData) {
    return mockLedgerEntries.find((entry) => entry.id === id) ?? null;
  }
  const db = await getPrisma();
  const row = await db.ledgerEntry.findUnique({ where: { id } });
  return row ? normalizeLedgerEntry(row) : null;
}

export async function exportJsonBundle(params: {
  userId: string;
  workspaceId: string;
  from?: Date;
  to?: Date;
}): Promise<LedgerBundle> {
  await assertReadableWorkspaceForUser(params.userId, params.workspaceId, true);
  let entries: LedgerEntry[];
  if (useMockData) {
    entries = filterEntries([...mockLedgerEntries], {
      workspaceId: params.workspaceId,
      from: params.from,
      to: params.to,
    }).sort(compareAsc);
  } else {
    const db = await getPrisma();
    const rows = await db.ledgerEntry.findMany({
      where: {
        workspaceId: params.workspaceId,
        signedAt: {
          gte: params.from,
          lte: params.to,
        },
      },
      orderBy: [{ signedAt: "asc" }, { id: "asc" }],
    });
    entries = rows.map(normalizeLedgerEntry);
  }

  return {
    signedBy: "vibehub-signer-v1",
    publicKey: publicKey(),
    entries,
  };
}

export async function verifyBundle(bundle: LedgerBundle) {
  return verifyLedgerBundle(bundle.entries, bundle.publicKey || publicKey());
}

export async function verifyStoredEntry(id: string) {
  const entry = await getById(id);
  if (!entry) {
    throw new RepositoryError("NOT_FOUND", "Ledger entry not found", 404);
  }

  let prevSignature: string | null = null;
  if (useMockData) {
    const previous = [...mockLedgerEntries]
      .filter((item) => item.workspaceId === entry.workspaceId)
      .sort(compareAsc)
      .find((candidate, index, array) => array[index + 1]?.id === entry.id);
    prevSignature = previous?.signature ?? null;
  } else {
    const db = await getPrisma();
    const previous = await db.ledgerEntry.findFirst({
      where: {
        workspaceId: entry.workspaceId,
        OR: [
          { signedAt: { lt: new Date(entry.signedAt) } },
          { signedAt: new Date(entry.signedAt), id: { lt: entry.id } },
        ],
      },
      orderBy: [{ signedAt: "desc" }, { id: "desc" }],
    });
    prevSignature = previous?.signature ?? null;
  }

  const ok = verifyEntry(entry, prevSignature, publicKey());
  return {
    ok,
    brokenAt: ok ? null : entry.id,
    totalChecked: 1,
    signedBy: "vibehub-signer-v1",
    publicKey: publicKey(),
  };
}

export async function anchorWorkspaceLedger(params: {
  userId: string;
  workspaceId: string;
  provider: LegalAnchorProvider;
  from?: Date;
  to?: Date;
}): Promise<AnchorWorkspaceLedgerResult> {
  const bundle = await exportJsonBundle({
    userId: params.userId,
    workspaceId: params.workspaceId,
    from: params.from,
    to: params.to,
  });
  if (bundle.entries.length === 0) {
    throw new RepositoryError("INVALID_INPUT", "Cannot anchor an empty ledger bundle", 400);
  }

  const receipt = await anchorLedgerBundle(params.provider, {
    workspaceId: params.workspaceId,
    requestedByUserId: params.userId,
    bundle,
  });
  const entryIds = bundle.entries.map((entry) => entry.id);
  const bundleHash = computeLedgerBundleHash(bundle);

  if (useMockData) {
    for (const entry of mockLedgerEntries) {
      if (entryIds.includes(entry.id)) {
        entry.anchorChain = receipt.provider;
        entry.anchorTxId = receipt.txId;
        entry.anchorVerifiedAt = receipt.verifiedAt;
      }
    }

    let attestationLinkId: string | undefined;
    const creator = (() => {
      if (params.workspaceId === `personal:${params.userId}`) {
        return mockCreators.find((item) => item.userId === params.userId);
      }
      if (params.workspaceId.startsWith("team:")) {
        const teamId = params.workspaceId.slice("team:".length);
        const team = mockTeams.find((item) => item.id === teamId);
        return team ? mockCreators.find((item) => item.userId === team.ownerUserId) : undefined;
      }
      return undefined;
    })();
    if (creator) {
      const linkId = randomUUID();
      mockLegalAttestationLinks.push({
        id: linkId,
        creatorProfileId: creator.id,
        label: receipt.label,
        href: receipt.href,
        createdAt: receipt.verifiedAt,
        updatedAt: receipt.verifiedAt,
      });
      attestationLinkId = linkId;
    }

    const anchorEntry = await appendEntry({
      workspaceId: params.workspaceId,
      actorType: "user",
      actorId: params.userId,
      actionKind: "ledger.anchor.apply",
      targetType: "ledger_bundle",
      targetId: receipt.txId,
      payload: {
        provider: receipt.provider,
        bundleHash,
        entryIds,
        entryCount: receipt.entryCount,
        href: receipt.href,
        txId: receipt.txId,
      },
    });

    return {
      provider: receipt.provider,
      workspaceId: params.workspaceId,
      entryCount: receipt.entryCount,
      bundleHash,
      txId: receipt.txId,
      href: receipt.href,
      verifiedAt: receipt.verifiedAt,
      attestationLinkId,
      ledgerEntryId: anchorEntry.id,
    };
  }

  const db = await getPrisma();
  const [workspace, creator] = await Promise.all([
    db.workspace.findUnique({
      where: { id: params.workspaceId },
      include: {
        team: {
          select: {
            ownerUserId: true,
          },
        },
      },
    }),
    db.creatorProfile.findFirst({
      where: {
        userId:
          params.workspaceId.startsWith("personal:")
            ? params.userId
            : undefined,
      },
      select: { id: true },
    }),
  ]);

  const ownerUserId =
    workspace?.kind === "personal" ? workspace.userId ?? params.userId : workspace?.team?.ownerUserId ?? null;

  return db.$transaction(async (tx) => {
    await tx.ledgerEntry.updateMany({
      where: { id: { in: entryIds } },
      data: {
        anchorChain: receipt.provider,
        anchorTxId: receipt.txId,
        anchorVerifiedAt: new Date(receipt.verifiedAt),
      },
    });

    let attestationLinkId: string | undefined;
    if (ownerUserId) {
      const ownerCreator =
        creator ??
        (await tx.creatorProfile.findUnique({
          where: { userId: ownerUserId },
          select: { id: true },
        }));
      if (ownerCreator) {
        const link = await tx.legalAttestationLink.create({
          data: {
            creatorProfileId: ownerCreator.id,
            label: receipt.label,
            href: receipt.href,
          },
          select: { id: true },
        });
        attestationLinkId = link.id;
      }
    }

    const anchorEntry = await appendEntry({
      client: tx,
      workspaceId: params.workspaceId,
      actorType: "user",
      actorId: params.userId,
      actionKind: "ledger.anchor.apply",
      targetType: "ledger_bundle",
      targetId: receipt.txId,
      payload: {
        provider: receipt.provider,
        bundleHash,
        entryIds,
        entryCount: receipt.entryCount,
        href: receipt.href,
        txId: receipt.txId,
      },
    });

    return {
      provider: receipt.provider,
      workspaceId: params.workspaceId,
      entryCount: receipt.entryCount,
      bundleHash,
      txId: receipt.txId,
      href: receipt.href,
      verifiedAt: receipt.verifiedAt,
      attestationLinkId,
      ledgerEntryId: anchorEntry.id,
    };
  });
}
