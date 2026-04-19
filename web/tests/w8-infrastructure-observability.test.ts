import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkDistributedRateLimit } from "../src/lib/distributed-rate-limit";
import { emitSystemAlert, listRecentSystemAlerts } from "../src/lib/system-alerts";
import { getSystemHealthSnapshot } from "../src/lib/system-health";
import { mockSystemAlerts } from "../src/lib/data/mock-data";

const baseAlerts = structuredClone(mockSystemAlerts);
const originalEnv = { ...process.env };

function restoreMockArray<T>(target: T[], source: T[]) {
  target.splice(0, target.length, ...structuredClone(source));
}

beforeEach(() => {
  restoreMockArray(mockSystemAlerts, baseAlerts);
  process.env = { ...originalEnv };
  delete process.env.REDIS_URL;
  delete process.env.FEISHU_ALERT_WEBHOOK_URL;
  delete process.env.ALERT_EMAIL_TO;
  delete process.env.ADMIN_AI_PROVIDER_BASE_URL;
  delete process.env.ADMIN_AI_PROVIDER_API_KEY;
  delete process.env.ADMIN_AI_MODEL;
  delete process.env.ADMIN_AI_PROVIDER_NAME;
  Object.assign(process.env, { NODE_ENV: "development" });
});

afterEach(() => {
  restoreMockArray(mockSystemAlerts, baseAlerts);
  process.env = { ...originalEnv };
});

describe("W8 distributed rate limits", () => {
  it("falls back to in-memory limiting when redis is absent", async () => {
    const first = await checkDistributedRateLimit({ bucketKey: "test:w8:bucket", maxRequests: 1 });
    const second = await checkDistributedRateLimit({ bucketKey: "test:w8:bucket", maxRequests: 1 });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.backend).toBe("memory_fallback");
      expect(second.retryAfterSeconds).toBeGreaterThan(0);
    }
  });
});

describe("W8 system alerts", () => {
  it("deduplicates repeated alerts within the window", async () => {
    const first = await emitSystemAlert({
      kind: "redis.memory_fallback",
      severity: "warning",
      message: "Redis fallback engaged",
      dedupeKey: "redis-fallback",
      metadata: { source: "test" },
    });
    const second = await emitSystemAlert({
      kind: "redis.memory_fallback",
      severity: "warning",
      message: "Redis fallback engaged again",
      dedupeKey: "redis-fallback",
      metadata: { source: "test" },
    });

    expect(second.id).toBe(first.id);
    const alerts = await listRecentSystemAlerts({ limit: 10 });
    expect(alerts.filter((item) => item.dedupeKey === "redis-fallback")).toHaveLength(1);
  });

  it("surfaces recent alerts and AI fallback in system health", async () => {
    await emitSystemAlert({
      kind: "billing.webhook_failed",
      severity: "critical",
      message: "Webhook failed during test",
      dedupeKey: "billing-webhook-test",
    });

    const snapshot = await getSystemHealthSnapshot({ includeRecentAlerts: true });
    expect(snapshot.checks.ai).toBe("fallback");
    expect(snapshot.recentAlerts?.[0]?.kind).toBe("billing.webhook_failed");
    // v10 已收口为 China-only Alipay；v11 RFC §0.1 沿用此约束
    expect(snapshot.paymentProviders).toHaveLength(1);
    expect(snapshot.paymentProviders[0].id).toBe("alipay");
  });
});
