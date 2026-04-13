import Link from "next/link";
import { getAdminSessionForPage } from "@/lib/admin-auth";
import { listPostsForModeration } from "@/lib/repository";
import { AdminReviewActions } from "@/components/admin-review-actions";

export default async function AdminModerationPage() {
  const session = await getAdminSessionForPage();
  if (!session) {
    return (
      <>
        <main className="container section">
          <article className="card">
            <h1>Admin Access Required</h1>
            <a href="/api/v1/auth/demo-login?role=admin&redirect=/admin/moderation" className="button ghost">
              Demo login as admin
            </a>
          </article>
        </main>
      </>
    );
  }

  const { items } = await listPostsForModeration({
    status: "all",
    page: 1,
    limit: 50,
  });

  return (
    <>
      <main className="container section">
        <h1>Moderation Queue</h1>
        <p className="muted">
          Review status transitions: <code>{"pending -> approved/rejected"}</code>
        </p>
        <p>
          <Link href="/admin" className="inline-link">
            Back to dashboard
          </Link>
        </p>

        <div className="admin-list">
          {items.map((post) => (
            <article key={post.id} className="card">
              <div className="meta-row">
                <h3>{post.title}</h3>
                <span className={`status status-${post.reviewStatus}`}>{post.reviewStatus}</span>
              </div>
              <p>{post.body}</p>
              <div className="tag-row">
                {post.tags.map((tag) => (
                  <span key={`${post.id}-${tag}`} className="tag">
                    #{tag}
                  </span>
                ))}
              </div>
              <p className="muted">Author: {post.authorId}</p>
              {post.reviewStatus === "pending" ? (
                <AdminReviewActions postId={post.id} />
              ) : (
                <p className="muted">
                  Reviewed by {post.reviewedBy ?? "unknown"} at {post.reviewedAt ?? "N/A"}
                </p>
              )}
            </article>
          ))}
        </div>
      </main>
    </>
  );
}
