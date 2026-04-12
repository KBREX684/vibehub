import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { getAdminSessionForPage } from "@/lib/admin-auth";
import { getAdminOverview } from "@/lib/repository";

export default async function AdminPage() {
  const session = await getAdminSessionForPage();
  if (!session) {
    return (
      <>
        <SiteHeader />
        <main className="container section">
          <article className="card">
            <h1>Admin Access Required</h1>
            <p className="muted">Please login as admin to open moderation dashboard.</p>
            <a href="/api/v1/auth/demo-login?role=admin&redirect=/admin" className="button ghost">
              Demo login as admin
            </a>
          </article>
        </main>
      </>
    );
  }

  const overview = await getAdminOverview();

  return (
    <>
      <SiteHeader />
      <main className="container section">
        <h1>Admin Dashboard</h1>
        <p className="muted">Welcome, {session.name}. This is the P2-1 minimal operations console.</p>

        <section className="grid">
          <article className="card">
            <h3>Users</h3>
            <p>{overview.users}</p>
            <Link className="inline-link" href="/admin/users">
              Open user list
            </Link>
          </article>
          <article className="card">
            <h3>Pending Posts</h3>
            <p>{overview.pendingPosts}</p>
            <Link className="inline-link" href="/admin/moderation">
              Open moderation queue
            </Link>
          </article>
          <article className="card">
            <h3>Open Reports</h3>
            <p>{overview.openReports}</p>
            <a className="inline-link" href="/api/v1/admin/reports">
              View report API
            </a>
          </article>
          <article className="card">
            <h3>Pending Collaboration Intents</h3>
            <p>{overview.pendingCollaborationIntents}</p>
            <Link className="inline-link" href="/admin/collaboration">
              Open collaboration queue
            </Link>
          </article>
          <article className="card">
            <h3>Audit Logs</h3>
            <p>{overview.auditLogs}</p>
            <a className="inline-link" href="/api/v1/admin/audit-logs">
              View audit API
            </a>
          </article>
          <article className="card detail-full">
            <h3>协作意向漏斗（P2-3）</h3>
            <p className="muted small">
              公开指标接口{" "}
              <code className="code-inline">GET /api/v1/metrics/collaboration-intent-funnel</code>
            </p>
            <div className="funnel-grid">
              <div className="funnel-stat">
                <strong>{overview.collaborationIntentFunnel.totalSubmissions}</strong>
                <span>总提交</span>
              </div>
              <div className="funnel-stat">
                <strong>{overview.collaborationIntentFunnel.pending}</strong>
                <span>待审核</span>
              </div>
              <div className="funnel-stat">
                <strong>{overview.collaborationIntentFunnel.approved}</strong>
                <span>已通过</span>
              </div>
              <div className="funnel-stat">
                <strong>{overview.collaborationIntentFunnel.rejected}</strong>
                <span>已拒绝</span>
              </div>
              <div className="funnel-stat">
                <strong>{(overview.collaborationIntentFunnel.approvalRate * 100).toFixed(1)}%</strong>
                <span>通过率（已通过/总提交）</span>
              </div>
              <div className="funnel-stat">
                <strong>{(overview.collaborationIntentFunnel.reviewedApprovalRate * 100).toFixed(1)}%</strong>
                <span>审核通过率（已通过/已审结）</span>
              </div>
            </div>
          </article>
        </section>
      </main>
    </>
  );
}
