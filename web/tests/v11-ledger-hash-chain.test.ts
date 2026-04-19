import { beforeEach, describe, expect, it } from "vitest";
import { mockLedgerEntries } from "../src/lib/data/mock-data";
import { appendEntry, exportJsonBundle, verifyBundle } from "../src/lib/repositories/ledger.repository";

describe("v11 ledger hash chain (mock)", () => {
  beforeEach(() => {
    mockLedgerEntries.splice(0, mockLedgerEntries.length);
  });

  it("appends and verifies an exported bundle", async () => {
    for (let index = 0; index < 3; index += 1) {
      await appendEntry({
        workspaceId: "personal:u1",
        actorType: "user",
        actorId: "u1",
        actionKind: "workspace.snapshot.created",
        targetType: "workspace_snapshot",
        targetId: `snap_${index}`,
        payload: { index },
        signedAt: new Date(`2026-04-19T0${index}:00:00.000Z`),
      });
    }

    const bundle = await exportJsonBundle({ userId: "u1", workspaceId: "personal:u1" });
    const result = await verifyBundle(bundle);

    expect(bundle.entries).toHaveLength(3);
    expect(result.ok).toBe(true);
    expect(result.totalChecked).toBe(3);
  });

  it("fails verification when an entry payload is tampered with", async () => {
    for (let index = 0; index < 3; index += 1) {
      await appendEntry({
        workspaceId: "personal:u1",
        actorType: "user",
        actorId: "u1",
        actionKind: "workspace.deliverable.created",
        targetType: "workspace_deliverable",
        targetId: `deliv_${index}`,
        payload: { index, status: "draft" },
        signedAt: new Date(`2026-04-19T1${index}:00:00.000Z`),
      });
    }

    const bundle = await exportJsonBundle({ userId: "u1", workspaceId: "personal:u1" });
    bundle.entries[1] = {
      ...bundle.entries[1],
      payload: { ...(bundle.entries[1].payload ?? {}), tampered: true },
    };

    const result = await verifyBundle(bundle);

    expect(result.ok).toBe(false);
    expect(result.brokenAt).toBe(bundle.entries[1].id);
  });
});
