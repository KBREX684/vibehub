import { apiSuccess } from "@/lib/response";
import { getRuntimeDataMode, isMockDataEnabled } from "@/lib/runtime-mode";
import { getRedisHealth } from "@/lib/redis-rate-limit";

export async function GET() {
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
    service: "vibehub-api",
    version: "v1",
    status: database === "error" || websocket === "error" ? "degraded" : "ok",
    dataMode: getRuntimeDataMode(),
    useMockData: useMock,
    checks: {
      database,
      redis: redis.status,
      websocket,
    },
  });
}
