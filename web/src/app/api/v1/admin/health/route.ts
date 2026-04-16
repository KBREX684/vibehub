import { apiSuccess } from "@/lib/response";
import { requireAdminSession } from "@/lib/admin-auth";
import { isMockDataEnabled } from "@/lib/runtime-mode";
import { getRedisHealth } from "@/lib/redis-rate-limit";

/** v7 P0-10: admin-only system health (same checks as public health + service label). */
export async function GET() {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  const useMock = isMockDataEnabled();
  let database: "ok" | "error" | "skipped" = "skipped";
  if (!useMock) {
    try {
      const { prisma } = await import("@/lib/db");
      await prisma.$queryRaw`SELECT 1`;
      database = "ok";
    } catch {
      database = "error";
    }
  }

  const redis = await getRedisHealth();

  let websocket: "ok" | "error" | "skipped" = "skipped";
  const wsCheckUrl = process.env.WS_HEALTH_URL?.trim();
  if (wsCheckUrl) {
    try {
      const r = await fetch(wsCheckUrl, { signal: AbortSignal.timeout(2000) });
      websocket = r.ok ? "ok" : "error";
    } catch {
      websocket = "error";
    }
  }

  return apiSuccess({
    checks: { database, redis: redis.status, websocket },
    mockData: useMock,
    nodeEnv: process.env.NODE_ENV ?? "unknown",
  });
}
