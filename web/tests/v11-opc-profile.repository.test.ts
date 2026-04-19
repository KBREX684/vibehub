import { beforeEach, describe, expect, it } from "vitest";
import {
  mockLedgerEntries,
  mockOpcProfiles,
  mockOpcTrustMetrics,
  mockWorkspaceArtifacts,
  mockWorkspaceSnapshots,
} from "../src/lib/data/mock-data";
import {
  computePersonalWorkspaceMetrics,
  getOrCreateOpcProfile,
  getPublicTrustCardBySlug,
  recomputeOpcTrustMetric,
  updateOpcProfile,
} from "../src/lib/repositories/opc-profile.repository";

describe("v11 opc profile repository (mock)", () => {
  beforeEach(() => {
    mockLedgerEntries.splice(0, mockLedgerEntries.length);
    mockOpcProfiles.splice(0, mockOpcProfiles.length);
    mockOpcTrustMetrics.splice(0, mockOpcTrustMetrics.length);
    mockWorkspaceArtifacts.splice(0, mockWorkspaceArtifacts.length);
    mockWorkspaceSnapshots.splice(0, mockWorkspaceSnapshots.length);
  });

  it("computes monthly personal workspace metrics from ledger and stamped artifacts", async () => {
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 2, 0, 0, 0, 0));
    const lastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 20, 0, 0, 0, 0));

    mockLedgerEntries.push({
      id: "le_current",
      workspaceId: "personal:u1",
      actorType: "user",
      actorId: "u1",
      actionKind: "workspace.snapshot.created",
      payload: {},
      payloadHash: "hash-current",
      signature: "sig-current",
      signedAt: monthStart.toISOString(),
      anchorChain: "vibehub",
    });
    mockLedgerEntries.push({
      id: "le_old",
      workspaceId: "personal:u1",
      actorType: "user",
      actorId: "u1",
      actionKind: "workspace.snapshot.created",
      payload: {},
      payloadHash: "hash-old",
      signature: "sig-old",
      signedAt: lastMonth.toISOString(),
      anchorChain: "vibehub",
    });

    mockWorkspaceArtifacts.push(
      {
        id: "wa_1",
        workspaceId: "personal:u1",
        filename: "one.png",
        contentType: "image/png",
        sizeBytes: 128,
        storageKey: "mock://one.png",
        uploaderUserId: "u1",
        visibility: "workspace",
        validationState: "ready",
        aigcStampId: "stamp_1",
        requireAigcStamp: true,
        createdAt: monthStart.toISOString(),
        updatedAt: monthStart.toISOString(),
      },
      {
        id: "wa_2",
        workspaceId: "personal:u1",
        filename: "two.png",
        contentType: "image/png",
        sizeBytes: 128,
        storageKey: "mock://two.png",
        uploaderUserId: "u1",
        visibility: "workspace",
        validationState: "ready",
        requireAigcStamp: true,
        createdAt: monthStart.toISOString(),
        updatedAt: monthStart.toISOString(),
      },
      {
        id: "wa_3",
        workspaceId: "personal:u1",
        filename: "old.png",
        contentType: "image/png",
        sizeBytes: 128,
        storageKey: "mock://old.png",
        uploaderUserId: "u1",
        visibility: "workspace",
        validationState: "ready",
        aigcStampId: "stamp_old",
        requireAigcStamp: true,
        createdAt: lastMonth.toISOString(),
        updatedAt: lastMonth.toISOString(),
      }
    );

    const metrics = await computePersonalWorkspaceMetrics("u1");

    expect(metrics.monthlyLedgerCount).toBe(1);
    expect(metrics.aigcStampCoveragePct).toBe(50);
  });

  it("creates and exposes a public trust card with recomputed metrics", async () => {
    mockLedgerEntries.push({
      id: "le_trust",
      workspaceId: "personal:u1",
      actorType: "user",
      actorId: "u1",
      actionKind: "workspace.deliverable.submitted",
      payload: {},
      payloadHash: "hash-trust",
      signature: "sig-trust",
      signedAt: new Date().toISOString(),
      anchorChain: "vibehub",
    });
    mockWorkspaceSnapshots.push({
      id: "ws_1",
      workspaceId: "personal:u1",
      title: "Alpha snapshot",
      summary: "Current alpha state",
      projectIds: ["p1"],
      projects: [{ id: "p1", slug: "agent-vibehub", title: "Agent VibeHub", openSource: true }],
      createdByUserId: "u1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    mockWorkspaceArtifacts.push({
      id: "wa_trust",
      workspaceId: "personal:u1",
      filename: "alpha.png",
      contentType: "image/png",
      sizeBytes: 256,
      storageKey: "mock://alpha.png",
      uploaderUserId: "u1",
      visibility: "workspace",
      validationState: "ready",
      aigcStampId: "stamp_trust",
      requireAigcStamp: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await getOrCreateOpcProfile("u1");
    await updateOpcProfile({
      userId: "u1",
      headline: "可信交付工程师",
      summary: "专注 AI 工作留痕与可验证交付。",
      publicCard: true,
    });

    const metrics = await recomputeOpcTrustMetric("u1");
    const card = await getPublicTrustCardBySlug("alice-ai-builder");

    expect(metrics.ledgerEntryCount).toBe(1);
    expect(metrics.snapshotCount).toBe(1);
    expect(metrics.stampedArtifactCount).toBe(1);
    expect(card.slug).toBe("alice-ai-builder");
    expect(card.headline).toBe("可信交付工程师");
    expect(card.metrics.ledgerEntryCount).toBe(1);
    expect(card.publicProjects.length).toBeGreaterThan(0);
  });
});
