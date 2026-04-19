import { beforeEach, describe, expect, it, vi } from "vitest";

const recomputeOpcTrustMetric = vi.fn();

vi.mock("@/lib/repositories/opc-profile.repository", () => ({
  recomputeOpcTrustMetric,
}));

vi.mock("@/lib/queue/instance", () => ({
  databaseUrl: vi.fn(() => undefined),
  getSharedBoss: vi.fn(async () => null),
}));

describe("v11 trust metric queue", () => {
  beforeEach(() => {
    recomputeOpcTrustMetric.mockReset();
    recomputeOpcTrustMetric.mockResolvedValue(undefined);
  });

  it("processes trust metric recompute jobs immediately when the queue is disabled", async () => {
    const { enqueueTrustMetricRecompute } = await import("@/lib/queue/recompute-trust-metric-queue");

    await enqueueTrustMetricRecompute({
      userId: "user_123",
      reason: "workspace.snapshot.created",
    });

    expect(recomputeOpcTrustMetric).toHaveBeenCalledWith("user_123");
  });
});
