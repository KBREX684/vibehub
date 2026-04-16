import Link from "next/link";
import { HeartPulse } from "lucide-react";
import { getAdminSessionForPage } from "@/lib/admin-auth";
import { getRedisHealth } from "@/lib/redis-rate-limit";
import { isMockDataEnabled } from "@/lib/runtime-mode";

export default async function AdminHealthPage() {
  const session = await getAdminSessionForPage();
  if (!session) return null;

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

  const checks = [
    { label: "Database", value: database },
    { label: "Redis", value: redis.status },
    { label: "WebSocket", value: websocket },
    { label: "Mock mode", value: useMock ? "enabled" : "disabled" },
    { label: "NODE_ENV", value: process.env.NODE_ENV ?? "unknown" },
  ];

  return (
    <main className="p-8 space-y-6">
      <div className="flex items-center gap-3 border-b border-[var(--color-border)] pb-5">
        <HeartPulse className="w-5 h-5 text-[var(--color-success)]" />
        <div>
          <h1 className="text-lg font-bold text-[var(--color-text-primary)]">System Health</h1>
          <p className="text-xs text-[var(--color-text-muted)]">Production-readiness checks for admin operators</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {checks.map((item) => (
          <div key={item.label} className="card p-4">
            <p className="text-xs text-[var(--color-text-muted)] m-0">{item.label}</p>
            <p className="text-sm font-semibold text-[var(--color-text-primary)] mt-2 mb-0">{item.value}</p>
          </div>
        ))}
      </div>
      <Link href="/admin" className="btn btn-ghost text-sm px-3 py-1.5 inline-flex w-fit">
        Back to dashboard
      </Link>
    </main>
  );
}
