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

  return apiSuccess({
    service: "vibehub-api",
    version: "v1",
    status: database === "error" ? "degraded" : "ok",
    dataMode: getRuntimeDataMode(),
    useMockData: useMock,
    checks: {
      database,
      redis: redis.status,
    },
  });
}
