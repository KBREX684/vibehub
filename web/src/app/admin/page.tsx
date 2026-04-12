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
        </section>
      </main>
    </>
  );
}
