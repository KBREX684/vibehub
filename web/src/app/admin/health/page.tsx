import Link from "next/link";
import { HeartPulse } from "lucide-react";
import { getAdminSessionForPage } from "@/lib/admin-auth";
import { getSystemHealthSnapshot } from "@/lib/system-health";

export default async function AdminHealthPage() {
  const session = await getAdminSessionForPage();
  if (!session) return null;

  const snapshot = await getSystemHealthSnapshot({ includeRecentAlerts: true });

  const checks = [
    { label: "Overall status", value: snapshot.status },
    { label: "Database", value: snapshot.checks.database },
    { label: "Redis", value: snapshot.checks.redis },
    { label: "WebSocket", value: snapshot.checks.websocket },
    { label: "SMTP", value: snapshot.checks.smtp },
    { label: "AI", value: `${snapshot.checks.ai} · ${snapshot.aiProvider.provider}` },
    { label: "Mock mode", value: snapshot.useMockData ? "enabled" : "disabled" },
    { label: "NODE_ENV", value: snapshot.nodeEnv },
  ];
  const payments = snapshot.paymentProviders;

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
      <section className="card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)] m-0">Payment providers</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {payments.map((provider) => (
            <div key={provider.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4">
              <p className="text-xs text-[var(--color-text-muted)] m-0">{provider.label}</p>
              <p className="text-sm font-semibold text-[var(--color-text-primary)] mt-2 mb-0">
                {provider.status} · {provider.mode}
              </p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-2 mb-0">{provider.notes[0]}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="card p-5 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)] m-0">Recent alerts</h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-1 mb-0">Latest unresolved infrastructure and provider alerts.</p>
        </div>
        <div className="space-y-3">
          {snapshot.recentAlerts?.length ? (
            snapshot.recentAlerts.map((alert) => (
              <div
                key={alert.id}
                className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)] m-0">
                    {alert.kind}
                  </p>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">
                    {alert.severity} · {alert.deliveryStatus}
                  </span>
                </div>
                <p className="text-sm text-[var(--color-text-primary)] mt-2 mb-1">{alert.message}</p>
                <p className="text-xs text-[var(--color-text-secondary)] m-0">
                  {new Date(alert.createdAt).toLocaleString()} · {alert.deliverySummary ?? "No delivery details"}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-[var(--color-text-muted)] m-0">No recent unresolved alerts.</p>
          )}
        </div>
      </section>
      <Link href="/admin" className="btn btn-ghost text-sm px-3 py-1.5 inline-flex w-fit">
        Back to dashboard
      </Link>
    </main>
  );
}
