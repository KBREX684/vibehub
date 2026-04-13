import Link from "next/link";
import { getAdminSessionForPage } from "@/lib/admin-auth";
import { listCollaborationIntentsForModeration } from "@/lib/repository";
import { AdminCollaborationReviewActions } from "@/components/admin-collaboration-review-actions";

export default async function AdminCollaborationQueuePage() {
  const session = await getAdminSessionForPage();
  if (!session) {
    return (
      <>
        <main className="container section">
          <article className="card">
            <h1>Admin Access Required</h1>
            <a href="/api/v1/auth/demo-login?role=admin&redirect=/admin/collaboration" className="button ghost">
              Demo login as admin
            </a>
          </article>
        </main>
      </>
    );
  }

  const { items } = await listCollaborationIntentsForModeration({
    status: "all",
    page: 1,
    limit: 100,
  });

  return (
    <>
      <main className="container section">
        <h1>Collaboration Intent Queue</h1>
        <p className="muted">Review user-submitted collaboration intents (join/recruit).</p>
        <p>
          <Link href="/admin" className="inline-link">
            Back to dashboard
          </Link>
        </p>

        <div className="admin-list">
          {items.map((intent) => (
            <article key={intent.id} className="card">
              <div className="meta-row">
                <h3>{intent.intentType === "join" ? "Join Request" : "Recruitment Notice"}</h3>
                <span className={`status status-${intent.status}`}>{intent.status}</span>
              </div>
              <p>{intent.message}</p>
              <p className="muted">Project: {intent.projectId}</p>
              <p className="muted">Applicant: {intent.applicantId}</p>
              {intent.contact ? <p className="muted">Contact: {intent.contact}</p> : null}

              {intent.status === "pending" ? (
                <AdminCollaborationReviewActions intentId={intent.id} />
              ) : (
                <p className="muted">
                  Reviewed by {intent.reviewedBy ?? "unknown"} at {intent.reviewedAt ?? "N/A"}
                </p>
              )}
            </article>
          ))}
        </div>
      </main>
    </>
  );
}