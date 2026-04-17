import { getAdminAiProviderReadiness } from "@/lib/admin-ai-provider";
import { getSmtpReadiness, listPaymentProviderReadiness } from "@/lib/billing/provider-config";
import { getRedisHealth, isProductionLikeInfra } from "@/lib/redis";
import { listRecentSystemAlerts } from "@/lib/system-alerts";
import { isMockDataEnabled, getRuntimeDataMode } from "@/lib/runtime-mode";

export interface SystemHealthSnapshot {
  service: string;
  version: string;
  status: "ok" | "degraded";
  dataMode: string;
  useMockData: boolean;
  nodeEnv: string;
  productionLike: boolean;
  checks: {
    database: "ok" | "error" | "skipped";
    redis: "ok" | "error" | "not_configured";
    websocket: "ok" | "error" | "skipped";
    smtp: "ready" | "not_configured";
    payments: Record<string, string>;
    ai: "ready" | "fallback";
  };
  paymentProviders: ReturnType<typeof listPaymentProviderReadiness>;
  aiProvider: ReturnType<typeof getAdminAiProviderReadiness>;
  recentAlerts?: Awaited<ReturnType<typeof listRecentSystemAlerts>>;
}

export async function getSystemHealthSnapshot(options?: { service?: string; includeRecentAlerts?: boolean }): Promise<SystemHealthSnapshot> {
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
  const smtp = getSmtpReadiness();
  const paymentProviders = listPaymentProviderReadiness();
  const payments = Object.fromEntries(paymentProviders.map((provider) => [provider.id, provider.status]));
  const aiProvider = getAdminAiProviderReadiness();
  const ai = aiProvider.status === "ready" ? "ready" : "fallback";

  let websocket: "ok" | "error" | "skipped" = "skipped";
  const wsCheckUrl = process.env.WS_HEALTH_URL?.trim();
  if (wsCheckUrl) {
    try {
      const response = await fetch(wsCheckUrl, { signal: AbortSignal.timeout(2000) });
      websocket = response.ok ? "ok" : "error";
    } catch {
      websocket = "error";
    }
  }

  const productionLike = isProductionLikeInfra();
  const paymentReady = paymentProviders.some((provider) => provider.status === "ready");
  const status: "ok" | "degraded" =
    database === "error" ||
    websocket === "error" ||
    (productionLike && (redis.status !== "ok" || smtp !== "ready" || !paymentReady))
      ? "degraded"
      : "ok";

  return {
    service: options?.service ?? "vibehub-api",
    version: "v1",
    status,
    dataMode: getRuntimeDataMode(),
    useMockData: useMock,
    nodeEnv: process.env.NODE_ENV ?? "unknown",
    productionLike,
    checks: {
      database,
      redis: redis.status,
      websocket,
      smtp,
      payments,
      ai,
    },
    paymentProviders,
    aiProvider,
    recentAlerts: options?.includeRecentAlerts ? await listRecentSystemAlerts({ limit: 8 }) : undefined,
  };
}
