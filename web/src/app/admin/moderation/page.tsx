import { getAdminSessionForPage } from "@/lib/admin-auth";
import { listPostsForModeration } from "@/lib/repository";
import { AdminReviewActions } from "@/components/admin-review-actions";
import { FileText } from "lucide-react";

export default async function AdminModerationPage() {
  const session = await getAdminSessionForPage();
  if (!session) return null;

  const { items } = await listPostsForModeration({ status: "all", page: 1, limit: 50 });
  const pending  = items.filter((p) => p.reviewStatus === "pending");
  const reviewed = items.filter((p) => p.reviewStatus !== "pending");

  return (
    <main className="p-8 space-y-6">
      <div className="flex items-center gap-3 border-b border-[var(--color-border)] pb-5">
        <FileText className="w-5 h-5 text-[var(--color-warning)]" />
        <div>
          <h1 className="text-lg font-bold text-[var(--color-text-primary)]">Moderation Queue</h1>
          <p className="text-xs text-[var(--color-text-muted)]">
            {pending.length} pending · {reviewed.length} reviewed
          </p>
        </div>
      </div>

      {pending.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-sm text-[var(--color-text-secondary)]">Queue is empty.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pending.map((post) => (
            <div key={post.id} className="card p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{post.title}</h3>
                <span className="tag tag-yellow shrink-0 capitalize">{post.reviewStatus}</span>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)] line-clamp-3">{post.body}</p>
              <div className="tag-row">
                {post.tags.map((t) => (
                  <span key={t} className="tag">
                    #{t}
                  </span>
                ))}
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">Author: {post.authorId}</p>
              <AdminReviewActions postId={post.id} />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
