/**
 * P4-BE-1: Reusable system-health check extracted from the health route.
 */

import { getRuntimeDataMode, isMockDataEnabled } from "@/lib/runtime-mode";
import { getRedisHealth } from "@/lib/redis-rate-limit";
import { getMetricsSummary } from "./metrics";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ServiceStatus = "ok" | "error" | "skipped";

export interface SystemHealth {
  service: string;
  version: string;
  status: "ok" | "degraded";
  dataMode: ReturnType<typeof getRuntimeDataMode>;
  useMockData: boolean;
  uptime: {
    seconds: number;
    humanReadable: string;
  };
  node: {
    version: string;
  };
  memory: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  checks: {
    database: ServiceStatus;
    redis: string;
    websocket: ServiceStatus;
  };
  metricsSummary: {
    totalRequests: number;
    totalErrors: number;
    totalBusinessEvents: number;
    uniqueRoutes: number;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getSystemHealth(): Promise<SystemHealth> {
  const useMock = isMockDataEnabled();

  // --- Database check ---
  let database: ServiceStatus = "skipped";
  if (!useMock) {
    try {
      const { prisma } = await import("@/lib/db");
      await prisma.$queryRaw`SELECT 1`;
      database = "ok";
    } catch {
      database = "error";
    }
  }

  // --- Redis check ---
  const redis = await getRedisHealth();

  // --- WebSocket check ---
  let websocket: ServiceStatus = "skipped";
  const wsCheckUrl = process.env.WS_HEALTH_URL?.trim();
  if (wsCheckUrl) {
    try {
      const r = await fetch(wsCheckUrl, { signal: AbortSignal.timeout(2000) });
      websocket = r.ok ? "ok" : "error";
    } catch {
      websocket = "error";
    }
  }

  // --- Memory / uptime ---
  const mem = process.memoryUsage();
  const uptimeSec = process.uptime();

  return {
    service: "vibehub-api",
    version: "v1",
    status: database === "error" || websocket === "error" ? "degraded" : "ok",
    dataMode: getRuntimeDataMode(),
    useMockData: useMock,
    uptime: {
      seconds: Math.round(uptimeSec),
      humanReadable: formatUptime(uptimeSec),
    },
    node: {
      version: process.version,
    },
    memory: {
      rss: mem.rss,
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      external: mem.external,
    },
    checks: {
      database,
      redis: redis.status,
      websocket,
    },
    metricsSummary: getMetricsSummary(),
  };
}
