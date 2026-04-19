import { beforeEach, describe, expect, it } from "vitest";
import {
  mockAigcStamps,
  mockLedgerEntries,
  mockWorkspaceArtifacts,
  mockWorkspacePreferences,
} from "../src/lib/data/mock-data";
import { runAigcStampPipeline } from "../src/lib/aigc/pipeline";

describe("v11 AIGC stamp pipeline (mock)", () => {
  beforeEach(() => {
    mockAigcStamps.splice(0, mockAigcStamps.length);
    mockLedgerEntries.splice(0, mockLedgerEntries.length);
    mockWorkspaceArtifacts.splice(0, mockWorkspaceArtifacts.length);
    mockWorkspacePreferences.splice(0, mockWorkspacePreferences.length);
  });

  it("stamps an artifact and appends a ledger entry", async () => {
    mockWorkspaceArtifacts.push({
      id: "wa_1",
      workspaceId: "personal:u1",
      filename: "demo.png",
      contentType: "image/png",
      sizeBytes: 1024,
      storageKey: "mock://workspace/personal:u1/demo.png",
      uploaderUserId: "u1",
      uploaderName: "Alice",
      requireAigcStamp: true,
      visibility: "workspace",
      validationState: "ready",
      createdAt: "2026-04-19T00:00:00.000Z",
      updatedAt: "2026-04-19T00:00:00.000Z",
    });

    const result = await runAigcStampPipeline({
      artifactId: "wa_1",
      actorUserId: "u1",
      trigger: "manual",
    });

    expect(result.stamp.provider).toBe("local");
    expect(result.stamp.mode).toBe("image");
    expect(result.artifact.aigcStampId).toBeTruthy();
    expect(mockAigcStamps).toHaveLength(1);
    expect(mockLedgerEntries).toHaveLength(1);
    expect(mockLedgerEntries[0]?.actionKind).toBe("aigc.stamp.apply");
    expect(mockLedgerEntries[0]?.targetId).toBe("wa_1");
  });

  it("updates the existing stamp instead of creating duplicates", async () => {
    mockWorkspaceArtifacts.push({
      id: "wa_2",
      workspaceId: "personal:u1",
      filename: "demo.txt",
      contentType: "text/plain",
      sizeBytes: 512,
      storageKey: "mock://workspace/personal:u1/demo.txt",
      uploaderUserId: "u1",
      uploaderName: "Alice",
      requireAigcStamp: true,
      visibility: "workspace",
      validationState: "ready",
      createdAt: "2026-04-19T00:00:00.000Z",
      updatedAt: "2026-04-19T00:00:00.000Z",
    });

    const first = await runAigcStampPipeline({
      artifactId: "wa_2",
      actorUserId: "u1",
      trigger: "manual",
    });
    const second = await runAigcStampPipeline({
      artifactId: "wa_2",
      actorUserId: "u1",
      force: true,
      trigger: "manual",
    });

    expect(mockAigcStamps).toHaveLength(1);
    expect(second.stamp.id).toBe(first.stamp.id);
  });
});
