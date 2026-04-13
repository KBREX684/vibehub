import Link from "next/link";
import { AdminWeeklyMaterializeForm } from "@/components/admin-weekly-materialize-form";
import { SiteHeader } from "@/components/site-header";
import { getAdminSessionForPage } from "@/lib/admin-auth";
import { getAdminOverview } from "@/lib/repository";
import { Users, AlertTriangle, Flag, Link as LinkIcon, ShieldAlert, Activity, Filter } from "lucide-react";

export default async function AdminPage() {
  const session = await getAdminSessionForPage();
  if (!session) {
    return (
      <>
        <SiteHeader />
        <main className="container pb-24">
          <div className="max-w-md mx-auto mt-20 p-8 rounded-[32px] bg-[rgba(255,255,255,0.85)] backdrop-blur-[24px] saturate-[150%] shadow-[0_8px_32px_-4px_rgba(0,0,0,0.04)] text-center">
            <ShieldAlert className="w-12 h-12 text-[var(--color-text-tertiary)] mx-auto mb-4" />
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)] mb-2">Admin Access Required</h1>
            <p className="text-[0.95rem] text-[var(--color-text-secondary)] mb-8">
              Please login with administrator privileges to access the moderation dashboard.
            </p>
            <a href="/api/v1/auth/demo-login?role=admin&redirect=/admin" className="inline-flex items-center justify-center px-6 py-3 rounded-[980px] bg-[var(--color-accent-apple)] text-white font-medium hover:bg-[#0062cc] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_8px_24px_rgba(0,122,255,0.3)]">
              Demo Login as Admin
            </a>
          </div>
        </main>
      </>
    );
  }

  const overview = await getAdminOverview();

  return (
    <>
      <SiteHeader />
      <main className="container pb-24 space-y-8">
        {/* Header Bento */}
        <section className="p-8 md:p-12 rounded-[32px] bg-[rgba(255,255,255,0.85)] backdrop-blur-[24px] saturate-[150%] shadow-[0_8px_32px_-4px_rgba(0,0,0,0.04)] border border-white/60">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-black/5 flex items-center justify-center text-[var(--color-text-primary)]">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-semibold tracking-[-0.02em] text-[var(--color-text-primary)] m-0">
                Admin Dashboard
              </h1>
              <p className="text-[1.05rem] text-[var(--color-text-secondary)] mt-1">
                Welcome back, {session.name}. System operations overview.
              </p>
            </div>
          </div>
        </section>

        {/* Metrics Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/admin/users" className="group p-6 rounded-[24px] bg-[rgba(255,255,255,0.85)] backdrop-blur-[24px] border border-white/60 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-[0_16px_48px_-8px_rgba(0,0,0,0.08)] transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-[12px] bg-[#007aff]/10 flex items-center justify-center text-[#007aff]">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">Manage</span>
            </div>
            <div className="text-3xl font-semibold tracking-tight text-[var(--color-text-primary)] mb-1">{overview.users}</div>
            <div className="text-[0.95rem] font-medium text-[var(--color-text-secondary)]">Total Users</div>
          </Link>

          <Link href="/admin/moderation" className="group p-6 rounded-[24px] bg-[rgba(255,255,255,0.85)] backdrop-blur-[24px] border border-white/60 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-[0_16px_48px_-8px_rgba(0,0,0,0.08)] transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-[12px] bg-[#f5ebd4]/40 flex items-center justify-center text-[#d97706]">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">Queue</span>
            </div>
            <div className="text-3xl font-semibold tracking-tight text-[var(--color-text-primary)] mb-1">{overview.pendingPosts}</div>
            <div className="text-[0.95rem] font-medium text-[var(--color-text-secondary)]">Pending Posts</div>
          </Link>

          <a href="/api/v1/admin/reports" className="group p-6 rounded-[24px] bg-[rgba(255,255,255,0.85)] backdrop-blur-[24px] border border-white/60 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-[0_16px_48px_-8px_rgba(0,0,0,0.08)] transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-[12px] bg-[#fee2e2] flex items-center justify-center text-[#e11d48]">
                <Flag className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">API</span>
            </div>
            <div className="text-3xl font-semibold tracking-tight text-[var(--color-text-primary)] mb-1">{overview.openReports}</div>
            <div className="text-[0.95rem] font-medium text-[var(--color-text-secondary)]">Open Reports</div>
          </a>

          <Link href="/admin/collaboration" className="group p-6 rounded-[24px] bg-[rgba(255,255,255,0.85)] backdrop-blur-[24px] border border-white/60 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-[0_16px_48px_-8px_rgba(0,0,0,0.08)] transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-[12px] bg-[#81e6d9]/20 flex items-center justify-center text-[#0d9488]">
                <LinkIcon className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">Queue</span>
            </div>
            <div className="text-3xl font-semibold tracking-tight text-[var(--color-text-primary)] mb-1">{overview.pendingCollaborationIntents}</div>
            <div className="text-[0.95rem] font-medium text-[var(--color-text-secondary)]">Pending Intents</div>
          </Link>

          <a href="/api/v1/admin/audit-logs" className="group p-6 rounded-[24px] bg-[rgba(255,255,255,0.85)] backdrop-blur-[24px] border border-white/60 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-[0_16px_48px_-8px_rgba(0,0,0,0.08)] transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-[12px] bg-black/5 flex items-center justify-center text-[var(--color-text-primary)]">
                <Activity className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">API</span>
            </div>
            <div className="text-3xl font-semibold tracking-tight text-[var(--color-text-primary)] mb-1">{overview.auditLogs}</div>
            <div className="text-[0.95rem] font-medium text-[var(--color-text-secondary)]">Audit Logs</div>
          </a>

          <a href="/api/v1/admin/mcp-invoke-audits" className="group p-6 rounded-[24px] bg-[rgba(255,255,255,0.85)] backdrop-blur-[24px] border border-white/60 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-[0_16px_48px_-8px_rgba(0,0,0,0.08)] transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-[12px] bg-black/5 flex items-center justify-center text-[var(--color-text-primary)]">
                <Filter className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">API</span>
            </div>
            <div className="text-3xl font-semibold tracking-tight text-[var(--color-text-primary)] mb-1">MCP v2</div>
            <div className="text-[0.95rem] font-medium text-[var(--color-text-secondary)]">Invocation Audits</div>
          </a>
        </section>

        {/* Funnel Bento */}
        <section className="p-8 rounded-[32px] bg-[rgba(255,255,255,0.85)] backdrop-blur-[24px] saturate-[150%] shadow-[0_8px_32px_-4px_rgba(0,0,0,0.04)] border border-white/60">
          <div className="flex items-center gap-3 mb-6">
            <Filter className="w-6 h-6 text-[#0d9488]" />
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)] m-0">Collaboration Intent Funnel</h2>
          </div>
          <p className="text-[0.95rem] text-[var(--color-text-secondary)] mb-8">
            Public metrics endpoint available at <code className="font-mono bg-black/5 px-2 py-0.5 rounded-md text-[0.85rem]">GET /api/v1/metrics/collaboration-intent-funnel</code>
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="p-5 rounded-[20px] bg-black/5 border border-black/5 flex flex-col">
              <strong className="text-2xl font-semibold text-[var(--color-text-primary)] mb-1">{overview.collaborationIntentFunnel.totalSubmissions}</strong>
              <span className="text-[0.85rem] font-medium text-[var(--color-text-secondary)]">Total Submissions</span>
            </div>
            <div className="p-5 rounded-[20px] bg-[#f5ebd4]/30 border border-[#f5ebd4]/50 flex flex-col">
              <strong className="text-2xl font-semibold text-[#d97706] mb-1">{overview.collaborationIntentFunnel.pending}</strong>
              <span className="text-[0.85rem] font-medium text-[var(--color-text-secondary)]">Pending</span>
            </div>
            <div className="p-5 rounded-[20px] bg-[#81e6d9]/20 border border-[#81e6d9]/40 flex flex-col">
              <strong className="text-2xl font-semibold text-[#0d9488] mb-1">{overview.collaborationIntentFunnel.approved}</strong>
              <span className="text-[0.85rem] font-medium text-[var(--color-text-secondary)]">Approved</span>
            </div>
            <div className="p-5 rounded-[20px] bg-[#fee2e2] border border-[#fecaca] flex flex-col">
              <strong className="text-2xl font-semibold text-[#e11d48] mb-1">{overview.collaborationIntentFunnel.rejected}</strong>
              <span className="text-[0.85rem] font-medium text-[var(--color-text-secondary)]">Rejected</span>
            </div>
            <div className="p-5 rounded-[20px] bg-black/5 border border-black/5 flex flex-col">
              <strong className="text-2xl font-semibold text-[var(--color-text-primary)] mb-1">{(overview.collaborationIntentFunnel.approvalRate * 100).toFixed(1)}%</strong>
              <span className="text-[0.85rem] font-medium text-[var(--color-text-secondary)]">Overall Approval</span>
            </div>
            <div className="p-5 rounded-[20px] bg-black/5 border border-black/5 flex flex-col">
              <strong className="text-2xl font-semibold text-[var(--color-text-primary)] mb-1">{(overview.collaborationIntentFunnel.reviewedApprovalRate * 100).toFixed(1)}%</strong>
              <span className="text-[0.85rem] font-medium text-[var(--color-text-secondary)]">Reviewed Approval</span>
            </div>
          </div>
        </section>

        <AdminWeeklyMaterializeForm />
      </main>
    </>
  );
}
