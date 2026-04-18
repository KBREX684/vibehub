import Link from "next/link";
import { AlertTriangle, BarChart3, Cpu, Flag, Users } from "lucide-react";
import { getAdminSessionForPage } from "@/lib/admin-auth";
import { listReportTickets } from "@/lib/repository";
import { listAdminAiSuggestions } from "@/lib/admin-ai";
import { getAdminDashboardSnapshot } from "@/lib/admin/metrics";
import { StatCard } from "@/components/ui/stat-card";
import { AdminMetricSparkline } from "@/components/admin-metric-sparkline";
import { TagPill } from "@/components/ui";
import { formatLocalizedDateTime } from "@/lib/formatting";
import { getServerLanguage } from "@/lib/i18n";

export default async function AdminDashboardPage() {
  const session = await getAdminSessionForPage();
  if (!session) return null;
  const language = await getServerLanguage();

  const [snapshot, openReports, pendingAi] = await Promise.all([
    getAdminDashboardSnapshot(),
    listReportTickets({ status: "open", page: 1, limit: 6, forAdmin: true }),
    listAdminAiSuggestions({ adminDecision: "pending", page: 1, limit: 6 }),
  ]);

  return (
    <main className="p-8 space-y-8">
      <section className="flex flex-col gap-2 border-b border-[var(--color-border)] pb-5">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[var(--color-accent-cyan)]" />
          <h1 className="text-lg font-bold text-[var(--color-text-primary)] m-0">Operations dashboard</h1>
        </div>
        <p className="text-sm text-[var(--color-text-secondary)] m-0">
          North-star collaboration metrics, support signals, and pending queues for moderators.
        </p>
        <p className="text-xs text-[var(--color-text-muted)] m-0">Generated {formatLocalizedDateTime(snapshot.generatedAt, language)}</p>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[var(--color-accent-cyan)]" />
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)] m-0">North stars</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {snapshot.northStars.map((metric) => (
            <StatCard
              key={metric.key}
              label={metric.label}
              value={metric.value}
              valueSuffix={metric.key.includes("rate") ? "%" : undefined}
              delta={metric.delta7d}
              deltaLabel="vs previous 7d"
              trend={<AdminMetricSparkline values={metric.sparkline} />}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Flag className="w-4 h-4 text-[var(--color-warning)]" />
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)] m-0">Support metrics</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {snapshot.supportMetrics.map((metric) => (
            <StatCard
              key={metric.key}
              label={metric.label}
              value={metric.value}
              delta={metric.delta7d}
              deltaLabel="vs previous 7d"
              invertDelta={metric.key === "open_reports"}
              trend={<AdminMetricSparkline values={metric.sparkline} />}
            />
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[var(--color-warning)]" />
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)] m-0">High-priority reports</h2>
            </div>
            <Link href="/admin/reports" className="text-xs text-[var(--color-primary)] hover:underline">Open reports</Link>
          </div>
          <div className="space-y-3">
            {openReports.items.length === 0 ? (
              <p className="text-sm text-[var(--color-text-secondary)] m-0">No open reports.</p>
            ) : (
              openReports.items.map((ticket) => (
                <article key={ticket.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[var(--color-text-primary)] m-0">{ticket.id.slice(0, 10)}…</p>
                    <TagPill accent={ticket.adminAi?.riskLevel === "high" ? "error" : ticket.adminAi?.riskLevel === "medium" ? "warning" : "default"} mono size="sm">
                      {ticket.adminAi?.riskLevel ?? "open"}
                    </TagPill>
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)] m-0">{ticket.reason}</p>
                  {ticket.adminAi ? <p className="text-[11px] text-[var(--color-text-muted)] m-0">{ticket.adminAi.suggestion}</p> : null}
                </article>
              ))
            )}
          </div>
        </div>

        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[var(--color-accent-violet)]" />
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)] m-0">Pending AI decisions</h2>
            </div>
            <Link href="/admin/ai-suggestions" className="text-xs text-[var(--color-primary)] hover:underline">Review queue</Link>
          </div>
          <div className="space-y-3">
            {pendingAi.items.length === 0 ? (
              <p className="text-sm text-[var(--color-text-secondary)] m-0">No pending AI suggestions.</p>
            ) : (
              pendingAi.items.map((item) => (
                <article key={item.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[var(--color-text-primary)] m-0">{item.targetType}</p>
                    <TagPill accent={item.riskLevel === "high" ? "error" : item.riskLevel === "medium" ? "warning" : "success"} mono size="sm">{item.riskLevel}</TagPill>
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)] m-0">Queue: {item.queue ?? "admin-review"} · Priority: {item.priority ?? "normal"}</p>
                  <p className="text-[11px] text-[var(--color-text-muted)] m-0">{item.suggestion}</p>
                </article>
              ))
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
