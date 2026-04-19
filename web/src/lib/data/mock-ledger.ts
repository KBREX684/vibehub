/**
 * Mock LedgerEntry data for v11 frontend development.
 *
 * Data contract matches backend P1 (GPT) — do not modify types.
 * 50+ entries covering all actionKinds, 30-day distribution,
 * 5 zhixin + 5 baoquan anchored entries.
 */

export type LedgerActorType = "user" | "agent";
export type LedgerAnchorChain = "vibehub" | "zhixin" | "baoquan";

export interface LedgerEntry {
  id: string;
  workspaceId: string;
  actorType: LedgerActorType;
  actorId: string;
  actionKind: string;
  targetType: string | null;
  targetId: string | null;
  payloadHash: string;
  prevHash: string | null;
  signature: string;
  signedAt: string;
  anchorChain: LedgerAnchorChain;
  anchorTxId: string | null;
  anchorVerifiedAt: string | null;
}

const WORKSPACE_ID = "ws_personal_alice";
const USER_ID = "user_alice";
const AGENT_ID = "agent_cursor_01";

const ACTION_KINDS = [
  "workspace.artifact.upload",
  "snapshot.create",
  "deliverable.approve",
  "agent.task.complete",
  "aigc.stamp.apply",
  "ledger.anchor.apply",
] as const;

const TARGET_TYPES: Record<string, string | null> = {
  "workspace.artifact.upload": "artifact",
  "snapshot.create": "snapshot",
  "deliverable.approve": "deliverable",
  "agent.task.complete": "agentTask",
  "aigc.stamp.apply": "artifact",
  "ledger.anchor.apply": null,
};

function randomHex(len: number): string {
  const chars = "0123456789abcdef";
  let result = "";
  for (let i = 0; i < len; i++) {
    result += chars[Math.floor(Math.random() * 16)];
  }
  return result;
}

function cuid(): string {
  return `cl${randomHex(6)}${randomHex(8)}`;
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(Math.floor(Math.random() * 14) + 8, Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));
  return d.toISOString();
}

function generateEntries(count: number): LedgerEntry[] {
  const entries: LedgerEntry[] = [];

  // Designate specific entries as anchored to zhixin/baoquan
  const zhixinIndices = new Set<number>();
  const baoquanIndices = new Set<number>();
  while (zhixinIndices.size < 5) zhixinIndices.add(Math.floor(Math.random() * count));
  while (baoquanIndices.size < 5) {
    const idx = Math.floor(Math.random() * count);
    if (!zhixinIndices.has(idx)) baoquanIndices.add(idx);
  }

  for (let i = 0; i < count; i++) {
    const actionKind = ACTION_KINDS[i % ACTION_KINDS.length];
    const isAgent = i % 3 === 0;
    const dayOffset = Math.floor((i / count) * 30);

    let anchorChain: LedgerAnchorChain = "vibehub";
    let anchorTxId: string | null = null;
    let anchorVerifiedAt: string | null = null;

    if (zhixinIndices.has(i)) {
      anchorChain = "zhixin";
      anchorTxId = `zhixin_${randomHex(16)}`;
      anchorVerifiedAt = daysAgo(Math.max(0, dayOffset - 1));
    } else if (baoquanIndices.has(i)) {
      anchorChain = "baoquan";
      anchorTxId = `bq_${randomHex(16)}`;
      anchorVerifiedAt = daysAgo(Math.max(0, dayOffset - 1));
    }

    const prevHash = i > 0 ? entries[i - 1].signature : null;

    entries.push({
      id: cuid(),
      workspaceId: WORKSPACE_ID,
      actorType: isAgent ? "agent" : "user",
      actorId: isAgent ? AGENT_ID : USER_ID,
      actionKind,
      targetType: TARGET_TYPES[actionKind],
      targetId: TARGET_TYPES[actionKind] ? `${TARGET_TYPES[actionKind]}_${randomHex(4)}` : null,
      payloadHash: randomHex(64),
      prevHash,
      signature: randomHex(64),
      signedAt: daysAgo(dayOffset),
      anchorChain,
      anchorTxId,
      anchorVerifiedAt,
    });
  }

  // Sort newest first
  entries.sort((a, b) => new Date(b.signedAt).getTime() - new Date(a.signedAt).getTime());
  return entries;
}

const _store: { entries: LedgerEntry[] | null } = { entries: null };

export function getMockLedgerEntries(): LedgerEntry[] {
  if (!_store.entries) {
    _store.entries = generateEntries(55);
  }
  return _store.entries;
}

export const mockLedgerEntries = getMockLedgerEntries();
