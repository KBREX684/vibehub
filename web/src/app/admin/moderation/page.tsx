import { getAdminSessionForPage } from "@/lib/admin-auth";
import { listPostsForModeration } from "@/lib/repository";
import { AdminReviewActions } from "@/components/admin-review-actions";
import { getOrCreatePostReviewAi } from "@/lib/admin-ai";
import { FileText } from "lucide-react";

export default async function AdminModerationPage() {
  const session = await getAdminSessionForPage();
  if (!session) return null;

  const { items } = await listPostsForModeration({ status: "all", page: 1, limit: 50 });
  const pending = await Promise.all(
    items
      .filter((p) => p.reviewStatus === "pending")
      .map(async (post) => ({
        ...post,
        adminAi: await getOrCreatePostReviewAi({
          postId: post.id,
          title: post.title,
          body: post.body,
          tags: post.tags,
        }),
      }))
  );
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
              <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-3">
                <p className="text-[11px] font-semibold text-[var(--color-text-primary)] m-0">AI suggestion</p>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1 mb-0">{post.adminAi.suggestion}</p>
                <p className="text-[10px] text-[var(--color-text-muted)] mt-2 mb-0">
                  Risk: {post.adminAi.riskLevel} · Confidence: {post.adminAi.confidence?.toFixed(2) ?? "n/a"}
                </p>
                <p className="text-[10px] text-[var(--color-text-muted)] mt-1 mb-0">
                  Queue: {post.adminAi.queue ?? "moderation-standard"} · Priority: {post.adminAi.priority ?? "normal"}
                </p>
                {post.adminAi.labels?.length ? (
                  <div className="tag-row mt-2">
                    {post.adminAi.labels.map((label) => (
                      <span key={label} className="tag">
                        {label}
                      </span>
                    ))}
                  </div>
                ) : null}
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
