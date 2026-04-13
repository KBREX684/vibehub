import Link from "next/link";
import { AdminWeeklyMaterializeForm } from "@/components/admin-weekly-materialize-form";
import { getAdminSessionForPage } from "@/lib/admin-auth";
import { getAdminOverview } from "@/lib/repository";
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
          <a
            href="/api/v1/auth/demo-login?role=admin&redirect=/admin"
            className="btn btn-primary text-sm px-6 py-2.5 inline-flex items-center gap-1.5"
          >
            Demo Login as Admin
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </main>
    );
  }

  const overview = await getAdminOverview();

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
      href: "/api/v1/admin/reports",
      icon: Flag,
      color: "var(--color-error)",
      value: overview.openReports,
      label: "Open Reports",
      badge: "API",
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
      href: "/api/v1/admin/audit-logs",
      icon: Activity,
      color: "var(--color-accent-cyan)",
      value: overview.auditLogs,
      label: "Audit Logs",
      badge: "API",
    },
    {
      href: "/api/v1/admin/mcp-invoke-audits",
      icon: Cpu,
      color: "var(--color-accent-violet)",
      value: "MCP v2",
      label: "Invocation Audits",
      badge: "API",
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

      <AdminWeeklyMaterializeForm />
    </main>
  );
}
