import Link from "next/link";
import { isDevDemoAuth } from "@/lib/dev-demo";
import { AdminWeeklyMaterializeForm } from "@/components/admin-weekly-materialize-form";
import { getAdminSessionForPage } from "@/lib/admin-auth";
import { getServerTranslator } from "@/lib/i18n";
import { getAdminOverview, listFeaturedProjects, listModerationCases, listProjects, listReportTickets } from "@/lib/repository";
import {
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
  const { t } = await getServerTranslator();

  if (!session) {
    return (
      <main className="container max-w-lg pb-24 pt-8">
        <div className="card p-10 text-center">
          <div className="w-12 h-12 rounded-[var(--radius-xl)] bg-[var(--color-error-subtle)] flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-6 h-6 text-[var(--color-error)]" />
          </div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
            {t("admin.dashboard.access_required", "Admin Access Required")}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mb-6">
            {t(
              "admin.dashboard.access_required_desc",
              "Login with administrator privileges to access the moderation dashboard."
            )}
          </p>
          {isDevDemoAuth() ? (
            <a
              href="/api/v1/auth/demo-login?role=admin&redirect=/admin"
              className="btn btn-primary text-sm px-6 py-2.5 inline-flex items-center gap-1.5"
            >
              {t("admin.dashboard.demo_login", "Demo Login as Admin")}
              <ArrowRight className="w-4 h-4" />
            </a>
          ) : (
            <Link
              href="/login?required=admin&redirect=%2Fadmin"
              className="btn btn-primary text-sm px-6 py-2.5 inline-flex items-center gap-1.5"
            >
              {t("admin.dashboard.sign_in", "Sign in as Admin")}
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
  const pendingModerationCount = moderationCases.items.filter((item) => item.status === "pending").length;
  const openReportsCount = reportTickets.items.filter((item) => item.status === "open").length;
  const highRiskReportCount = reportTickets.items.filter((item) => item.adminAi?.riskLevel === "high").length;
  const patrolReport = [
    highRiskReportCount > 0
      ? t(
          "admin.dashboard.patrol.high_risk",
          "Prioritize {count} high-risk report tickets before the standard moderation queue."
        ).replace("{count}", String(highRiskReportCount))
      : null,
    pendingModerationCount > 20
      ? t(
          "admin.dashboard.patrol.backlog_high",
          "Moderation backlog is elevated. Split the queue across at least two reviewers this cycle."
        )
      : t(
          "admin.dashboard.patrol.backlog_normal",
          "Moderation backlog is within normal range. Keep the fastlane focused on safety-sensitive tickets."
        ),
    openReportsCount > pendingModerationCount
      ? t(
          "admin.dashboard.patrol.reports_bias",
          "Open reports exceed pending post reviews. Bias reviewer time toward reports until the queue stabilizes."
        )
      : null,
  ].filter((line): line is string => Boolean(line));
  const batchSuggestionCopy: Record<string, { label: string; suggestion: string }> = {
    "sensitive-content": {
      label: t("admin.dashboard.batch.sensitive_content", "Sensitive content"),
      suggestion: t(
        "admin.dashboard.batch.sensitive_content_desc",
        "Escalate these tickets into the fastest safety queue and preserve moderator notes."
      ),
    },
    "spam-wave": {
      label: t("admin.dashboard.batch.spam_wave", "Spam wave"),
      suggestion: t(
        "admin.dashboard.batch.spam_wave_desc",
        "Batch-handle likely spam with one reviewer owning the cluster."
      ),
    },
    "abuse-pattern": {
      label: t("admin.dashboard.batch.abuse_pattern", "Abuse pattern"),
      suggestion: t(
        "admin.dashboard.batch.abuse_pattern_desc",
        "Check conversation context and repeated reporter/target pairs before closing."
      ),
    },
    "general-review": {
      label: t("admin.dashboard.batch.general_review", "General review"),
      suggestion: t(
        "admin.dashboard.batch.general_review_desc",
        "Use the standard report queue and merge duplicates where possible."
      ),
    },
  };

  const STAT_CARDS = [
    {
      href: "/admin/users",
      icon: Users,
      color: "var(--color-primary)",
      value: overview.users,
      label: t("admin.dashboard.stats.total_users", "Total Users"),
      badge: t("admin.dashboard.badge.manage", "Manage"),
    },
    {
      href: "/admin/moderation",
      icon: AlertTriangle,
      color: "var(--color-warning)",
      value: overview.pendingPosts,
      label: t("admin.dashboard.stats.pending_posts", "Pending Posts"),
      badge: t("admin.dashboard.badge.queue", "Queue"),
    },
    {
      href: "/admin/reports",
      icon: Flag,
      color: "var(--color-error)",
      value: overview.openReports,
      label: t("admin.dashboard.stats.open_reports", "Open Reports"),
      badge: t("admin.dashboard.badge.queue", "Queue"),
    },
    {
      href: "/admin/collaboration",
      icon: LinkIcon,
      color: "var(--color-success)",
      value: overview.pendingCollaborationIntents,
      label: t("admin.dashboard.stats.pending_intents", "Pending Intents"),
      badge: t("admin.dashboard.badge.queue", "Queue"),
    },
    {
      href: "/admin/audit-logs",
      icon: Activity,
      color: "var(--color-accent-cyan)",
      value: overview.auditLogs,
      label: t("admin.dashboard.stats.audit_logs", "Audit Logs"),
      badge: t("admin.dashboard.badge.ops", "Ops"),
    },
    {
      href: "/admin/mcp-audits",
      icon: Cpu,
      color: "var(--color-accent-violet)",
      value: "MCP v2",
      label: t("admin.dashboard.stats.invocation_audits", "Invocation Audits"),
      badge: t("admin.dashboard.badge.ops", "Ops"),
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
            <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
              {t("admin.dashboard.title", "Admin Dashboard")}
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {t("admin.dashboard.subtitle", "Welcome back, {name}. System operations overview.").replace("{name}", session.name)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {[
            { href: "/admin/users", label: t("admin.layout.users", "Users") },
            { href: "/admin/moderation", label: t("admin.layout.moderation", "Moderation") },
            { href: "/admin/collaboration", label: t("admin.layout.intents", "Intents") },
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
            {t("admin.dashboard.funnel.title", "Collaboration Intent Funnel")}
          </h2>
        </div>
        <p className="text-xs text-[var(--color-text-muted)] mb-5 font-mono">
          GET /api/v1/metrics/collaboration-intent-funnel
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: t("admin.dashboard.funnel.total", "Total"), value: overview.collaborationIntentFunnel.totalSubmissions, color: "var(--color-text-primary)" },
            { label: t("admin.dashboard.funnel.pending", "Pending"), value: overview.collaborationIntentFunnel.pending, color: "var(--color-warning)" },
            { label: t("admin.dashboard.funnel.approved", "Approved"), value: overview.collaborationIntentFunnel.approved, color: "var(--color-success)" },
            { label: t("admin.dashboard.funnel.rejected", "Rejected"), value: overview.collaborationIntentFunnel.rejected, color: "var(--color-error)" },
            { label: t("admin.dashboard.funnel.overall_rate", "Overall %"), value: `${(overview.collaborationIntentFunnel.approvalRate * 100).toFixed(1)}%`, color: "var(--color-primary-hover)" },
            { label: t("admin.dashboard.funnel.reviewed_rate", "Reviewed %"), value: `${(overview.collaborationIntentFunnel.reviewedApprovalRate * 100).toFixed(1)}%`, color: "var(--color-accent-cyan)" },
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
            <h2 className="text-base font-semibold text-[var(--color-text-primary)] m-0">
              {t("admin.dashboard.batch.title", "AI Batch Suggestions")}
            </h2>
          </div>
          <div className="space-y-3">
            {batchSuggestions.length === 0 ? (
              <p className="text-sm text-[var(--color-text-secondary)] m-0">
                {t("admin.dashboard.batch.empty", "No report clusters detected.")}
              </p>
            ) : (
              batchSuggestions.map((item) => (
                <article key={item.label} className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-4 bg-[var(--color-bg-elevated)]">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[var(--color-text-primary)] m-0">
                      {batchSuggestionCopy[item.label]?.label ?? item.label}
                    </p>
                    <span className="badge badge-neutral">{item.count}</span>
                  </div>
                  <p className="text-sm text-[var(--color-text-secondary)] mt-2 mb-0">
                    {batchSuggestionCopy[item.label]?.suggestion ?? item.suggestion}
                  </p>
                </article>
              ))
            )}
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[var(--color-accent-cyan)]" />
            <h2 className="text-base font-semibold text-[var(--color-text-primary)] m-0">
              {t("admin.dashboard.behavior.title", "Behavior Patterns")}
            </h2>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
                {t("admin.dashboard.behavior.frequent_reporters", "Frequent reporters")}
              </p>
              <div className="space-y-2">
                {behaviorPatterns.highFrequencyReporters.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-secondary)] m-0">
                    {t("admin.dashboard.behavior.no_reporters", "No elevated reporter patterns.")}
                  </p>
                ) : (
                  behaviorPatterns.highFrequencyReporters.map((row) => (
                    <div key={`reporter-${row.userId}`} className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-border)] p-3 bg-[var(--color-bg-elevated)]">
                      <span className="text-sm text-[var(--color-text-primary)]">{row.userId}</span>
                      <span className="badge badge-yellow">
                        {t("admin.dashboard.behavior.reports_count", "{count} reports").replace("{count}", String(row.count))}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
                {t("admin.dashboard.behavior.frequent_targets", "Frequently reported targets")}
              </p>
              <div className="space-y-2">
                {behaviorPatterns.highFrequencyTargets.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-secondary)] m-0">
                    {t("admin.dashboard.behavior.no_targets", "No elevated target patterns.")}
                  </p>
                ) : (
                  behaviorPatterns.highFrequencyTargets.map((row) => (
                    <div key={`target-${row.userId}`} className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-border)] p-3 bg-[var(--color-bg-elevated)]">
                      <span className="text-sm text-[var(--color-text-primary)]">{row.userId}</span>
                      <span className="badge badge-red">
                        {t("admin.dashboard.behavior.reports_count", "{count} reports").replace("{count}", String(row.count))}
                      </span>
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
          <h2 className="text-base font-semibold text-[var(--color-text-primary)] m-0">
            {t("admin.dashboard.patrol.title", "Content Patrol Report")}
          </h2>
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
