import type { ApiKeyUsageDailyBucket, ApiKeyUsageSnapshot, McpInvokeAuditRow } from "@/lib/types";

function toIsoDay(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function startOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function normalizeDays(days: number | undefined): number {
  const n = Number.isFinite(days) ? Math.trunc(days as number) : 7;
  return Math.min(Math.max(n || 7, 1), 30);
}

function normalizeLimit(limit: number | undefined): number {
  const n = Number.isFinite(limit) ? Math.trunc(limit as number) : 100;
  return Math.min(Math.max(n || 100, 1), 100);
}

function isSuccessStatus(httpStatus: number): boolean {
  return httpStatus >= 200 && httpStatus < 400;
}

export function createApiKeyUsageSnapshot(params: {
  rows: McpInvokeAuditRow[];
  recentInvocations?: McpInvokeAuditRow[];
  lastUsedAt?: string | null;
  now?: Date;
  days?: number;
  limit?: number;
}): ApiKeyUsageSnapshot {
  const now = params.now ?? new Date();
  const days = normalizeDays(params.days);
  const limit = normalizeLimit(params.limit);

  const periodStart = startOfUtcDay(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (days - 1))));
  const last7dStart = startOfUtcDay(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6)));
  const last24hStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const dailyBuckets = new Map<string, ApiKeyUsageDailyBucket>();
  for (let i = 0; i < days; i += 1) {
    const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (days - 1 - i)));
    const iso = toIsoDay(day);
    dailyBuckets.set(iso, { date: iso, count: 0, successCount: 0, errorCount: 0 });
  }

  const rowsInWindow = params.rows.filter((row) => new Date(row.createdAt) >= periodStart);
  const rowsInLast7d = rowsInWindow.filter((row) => new Date(row.createdAt) >= last7dStart);
  const rowsInLast24h = params.rows.filter((row) => new Date(row.createdAt) >= last24hStart);

  let successCount = 0;
  let errorCount = 0;
  let durationTotal = 0;
  let durationCount = 0;
  const uniqueTools = new Set<string>();

  for (const row of rowsInWindow) {
    const iso = row.createdAt.slice(0, 10);
    const bucket = dailyBuckets.get(iso);
    if (bucket) {
      bucket.count += 1;
      if (isSuccessStatus(row.httpStatus)) bucket.successCount += 1;
      else bucket.errorCount += 1;
    }

    if (isSuccessStatus(row.httpStatus)) successCount += 1;
    else errorCount += 1;
    if (typeof row.durationMs === "number" && Number.isFinite(row.durationMs)) {
      durationTotal += row.durationMs;
      durationCount += 1;
    }
    uniqueTools.add(row.tool);
  }

  const latestInvocation = [...(params.recentInvocations ?? params.rows)]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

  return {
    summary: {
      last7dCount: rowsInLast7d.length,
      last24hCount: rowsInLast24h.length,
      successCount,
      errorCount,
      avgDurationMs: durationCount > 0 ? Math.round(durationTotal / durationCount) : 0,
      uniqueTools: uniqueTools.size,
      lastUsedAt: params.lastUsedAt ?? latestInvocation?.createdAt,
    },
    daily: [...dailyBuckets.values()],
    recentInvocations: [...(params.recentInvocations ?? params.rows)]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit),
  };
}
