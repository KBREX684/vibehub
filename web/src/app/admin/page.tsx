import Link from "next/link";
import { isDevDemoAuth } from "@/lib/dev-demo";
import { AdminWeeklyMaterializeForm } from "@/components/admin-weekly-materialize-form";
import { getAdminSessionForPage } from "@/lib/admin-auth";
import { getAdminOverview, listFeaturedProjects, listModerationCases, listProjects, listReportTickets } from "@/lib/repository";
import {
  heuristicContentPatrolReport,
  heuristicProjectCurationSummary,
  heuristicReportBatchSuggestions,
  heuristicUserBehaviorPatterns,
} from "@/lib/admin-ai";
import { AdminDailyFeaturedPanel } from "@/components/admin-daily-featured-panel";
import {
  Users,
  AlertTriangle,
  Flag,
  Link as LinkIcon,
  ShieldAlert,
  Activity,
  Filter,
  ArrowRight,
  Cpu,
} from "lucide-react";

export default async function AdminPage() {
  const session = await getAdminSessionForPage();

  if (!session) {
    return (
      <main className="container max-w-lg pb-24 pt-8">
        <div className="card p-10 text-center">
          <div className="w-12 h-12 rounded-[var(--radius-xl)] bg-[var(--color-error-subtle)] flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-6 h-6 text-[var(--color-error)]" />
          </div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
            Admin Access Required
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mb-6">
            Login with administrator privileges to access the moderation dashboard.
          </p>
          {isDevDemoAuth() ? (
            <a
              href="/api/v1/auth/demo-login?role=admin&redirect=/admin"
              className="btn btn-primary text-sm px-6 py-2.5 inline-flex items-center gap-1.5"
            >
              Demo Login as Admin
              <ArrowRight className="w-4 h-4" />
            </a>
          ) : (
            <Link
              href="/login?required=admin&redirect=%2Fadmin"
              className="btn btn-primary text-sm px-6 py-2.5 inline-flex items-center gap-1.5"
            >
              Sign in as Admin
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </main>
    );
  }

  const [overview, featuredProjects, projectPickList, reportTickets, moderationCases] = await Promise.all([
    getAdminOverview(),
    listFeaturedProjects(),
    listProjects({ page: 1, limit: 12 }),
    listReportTickets({ status: "all", page: 1, limit: 60, forAdmin: true }),
    listModerationCases({ status: "all", page: 1, limit: 60 }),
  ]);
  const projectCandidates = projectPickList.items.map((project) => ({
    ...project,
    adminAi: heuristicProjectCurationSummary({
      projectId: project.id,
      title: project.title,
      oneLiner: project.oneLiner,
      hasDemoUrl: Boolean(project.demoUrl || project.websiteUrl),
      hasRepoUrl: Boolean(project.repoUrl),
      bookmarkCount: project.bookmarkCount,
      collaborationIntentCount: project.collaborationIntentCount,
      screenshots: project.screenshots.length,
    }),
  }));
  const batchSuggestions = heuristicReportBatchSuggestions(reportTickets.items);
  const behaviorPatterns = heuristicUserBehaviorPatterns(reportTickets.items);
  const patrolReport = heuristicContentPatrolReport({
    pendingModerationCount: moderationCases.items.filter((item) => item.status === "pending").length,
    openReportsCount: reportTickets.items.filter((item) => item.status === "open").length,
    highRiskReportCount: reportTickets.items.filter((item) => item.adminAi?.riskLevel === "high").length,
  });

  const STAT_CARDS = [
    {
      href: "/admin/users",
      icon: Users,
      color: "var(--color-primary)",
      value: overview.users,
      label: "Total Users",
      badge: "Manage",
    },
    {
      href: "/admin/moderation",
      icon: AlertTriangle,
      color: "var(--color-warning)",
      value: overview.pendingPosts,
      label: "Pending Posts",
      badge: "Queue",
    },
    {
      href: "/admin/reports",
      icon: Flag,
      color: "var(--color-error)",
      value: overview.openReports,
      label: "Open Reports",
      badge: "Queue",
    },
    {
      href: "/admin/collaboration",
      icon: LinkIcon,
      color: "var(--color-success)",
      value: overview.pendingCollaborationIntents,
      label: "Pending Intents",
      badge: "Queue",
    },
    {
      href: "/admin/audit-logs",
      icon: Activity,
      color: "var(--color-accent-cyan)",
      value: overview.auditLogs,
      label: "Audit Logs",
      badge: "Ops",
    },
    {
      href: "/admin/mcp-audits",
      icon: Cpu,
      color: "var(--color-accent-violet)",
      value: "MCP v2",
      label: "Invocation Audits",
      badge: "Ops",
    },
  ];

  return (
    <main className="container pb-24 space-y-8 pt-8">

      {/* Header */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--color-error-subtle)] flex items-center justify-center text-[var(--color-error)]">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Admin Dashboard</h1>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Welcome back, {session.name}. System operations overview.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {[
            { href: "/admin/users",        label: "Users"       },
            { href: "/admin/moderation",   label: "Moderation"  },
            { href: "/admin/collaboration", label: "Intents"    },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="btn btn-ghost text-sm px-3 py-1.5">
              {item.label}
            </Link>
          ))}
        </div>
      </section>

      {/* Metrics Grid */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {STAT_CARDS.map(({ href, icon: Icon, color, value, label, badge }) => (
          <a
            key={href}
            href={href}
            className="card p-5 flex flex-col gap-3 hover:-translate-y-0.5 transition-all duration-200 group"
          >
            <div className="flex items-center justify-between">
              <div
                className="w-8 h-8 rounded-[var(--radius-md)] flex items-center justify-center"
                style={{ background: `${color}18`, color }}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">{badge}</span>
            </div>
            <div className="text-2xl font-bold text-[var(--color-text-primary)]">{value}</div>
            <div className="text-xs font-medium text-[var(--color-text-secondary)]">{label}</div>
          </a>
        ))}
      </section>

      {/* Funnel */}
      <section className="card p-6">
        <div className="flex items-center gap-2 mb-5">
          <Filter className="w-4 h-4 text-[var(--color-success)]" />
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
            Collaboration Intent Funnel
          </h2>
        </div>
        <p className="text-xs text-[var(--color-text-muted)] mb-5 font-mono">
          GET /api/v1/metrics/collaboration-intent-funnel
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Total",     value: overview.collaborationIntentFunnel.totalSubmissions, color: "var(--color-text-primary)" },
            { label: "Pending",   value: overview.collaborationIntentFunnel.pending,          color: "var(--color-warning)" },
            { label: "Approved",  value: overview.collaborationIntentFunnel.approved,         color: "var(--color-success)" },
            { label: "Rejected",  value: overview.collaborationIntentFunnel.rejected,         color: "var(--color-error)" },
            { label: "Overall %", value: `${(overview.collaborationIntentFunnel.approvalRate * 100).toFixed(1)}%`, color: "var(--color-primary-hover)" },
            { label: "Reviewed %", value: `${(overview.collaborationIntentFunnel.reviewedApprovalRate * 100).toFixed(1)}%`, color: "var(--color-accent-cyan)" },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="p-4 rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] flex flex-col gap-1"
            >
              <strong className="text-xl font-bold" style={{ color }}>{value}</strong>
              <span className="text-xs text-[var(--color-text-muted)]">{label}</span>
            </div>
          ))}
        </div>
      </section>

      <AdminDailyFeaturedPanel candidates={projectCandidates} featured={featuredProjects} />

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[var(--color-accent-violet)]" />
            <h2 className="text-base font-semibold text-[var(--color-text-primary)] m-0">AI Batch Suggestions</h2>
          </div>
          <div className="space-y-3">
            {batchSuggestions.length === 0 ? (
              <p className="text-sm text-[var(--color-text-secondary)] m-0">No report clusters detected.</p>
            ) : (
              batchSuggestions.map((item) => (
                <article key={item.label} className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-4 bg-[var(--color-bg-elevated)]">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[var(--color-text-primary)] m-0">{item.label}</p>
                    <span className="badge badge-neutral">{item.count}</span>
                  </div>
                  <p className="text-sm text-[var(--color-text-secondary)] mt-2 mb-0">{item.suggestion}</p>
                </article>
              ))
            )}
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[var(--color-accent-cyan)]" />
            <h2 className="text-base font-semibold text-[var(--color-text-primary)] m-0">Behavior Patterns</h2>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)] mb-2">Frequent reporters</p>
              <div className="space-y-2">
                {behaviorPatterns.highFrequencyReporters.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-secondary)] m-0">No elevated reporter patterns.</p>
                ) : (
                  behaviorPatterns.highFrequencyReporters.map((row) => (
                    <div key={`reporter-${row.userId}`} className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-border)] p-3 bg-[var(--color-bg-elevated)]">
                      <span className="text-sm text-[var(--color-text-primary)]">{row.userId}</span>
                      <span className="badge badge-yellow">{row.count} reports</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)] mb-2">Frequently reported targets</p>
              <div className="space-y-2">
                {behaviorPatterns.highFrequencyTargets.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-secondary)] m-0">No elevated target patterns.</p>
                ) : (
                  behaviorPatterns.highFrequencyTargets.map((row) => (
                    <div key={`target-${row.userId}`} className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-border)] p-3 bg-[var(--color-bg-elevated)]">
                      <span className="text-sm text-[var(--color-text-primary)]">{row.userId}</span>
                      <span className="badge badge-red">{row.count} reports</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-[var(--color-primary-hover)]" />
          <h2 className="text-base font-semibold text-[var(--color-text-primary)] m-0">Content Patrol Report</h2>
        </div>
        <div className="space-y-3">
          {patrolReport.map((line) => (
            <div key={line} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4 text-sm text-[var(--color-text-secondary)]">
              {line}
            </div>
          ))}
        </div>
      </section>

      <AdminWeeklyMaterializeForm />
    </main>
  );
}
