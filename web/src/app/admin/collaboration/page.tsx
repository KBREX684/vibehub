import Link from "next/link";
import { isDevDemoAuth } from "@/lib/dev-demo";
import { getAdminSessionForPage } from "@/lib/admin-auth";
import { listCollaborationIntentsForModeration } from "@/lib/repository";
import { AdminCollaborationReviewActions } from "@/components/admin-collaboration-review-actions";
import { ArrowRight, Link2, ShieldAlert } from "lucide-react";
import { TagPill } from "@/components/ui";
import { formatLocalizedDateTime } from "@/lib/formatting";
import { getServerLanguage } from "@/lib/i18n";

export default async function AdminCollaborationQueuePage() {
  const session = await getAdminSessionForPage();
  const language = await getServerLanguage();
  if (!session) {
    return (
      <main className="container max-w-lg pb-24 pt-8">
        <div className="card p-10 text-center">
          <div className="w-12 h-12 rounded-[var(--radius-xl)] bg-[var(--color-error-subtle)] flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-6 h-6 text-[var(--color-error)]" />
          </div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">Admin Access Required</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mb-6">
            Login with administrator privileges to review collaboration intents.
          </p>
          {isDevDemoAuth() ? (
            <a
              href="/api/v1/auth/demo-login?role=admin&redirect=/admin/collaboration"
              className="btn btn-primary text-sm px-6 py-2.5 inline-flex items-center gap-1.5"
            >
              Demo Login as Admin
              <ArrowRight className="w-4 h-4" />
            </a>
          ) : (
            <Link
              href="/login?required=admin&redirect=%2Fadmin%2Fcollaboration"
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

  const { items } = await listCollaborationIntentsForModeration({
    status: "all",
    page: 1,
    limit: 100,
  });

  return (
    <main className="container pb-24 space-y-8 pt-8">
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--color-success-subtle)] flex items-center justify-center text-[var(--color-success)]">
            <Link2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Collaboration Intent Queue</h1>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Review user-submitted join and recruitment intents.
            </p>
          </div>
        </div>
        <Link href="/admin" className="btn btn-ghost text-sm px-3 py-1.5">
          Back to dashboard
        </Link>
      </section>

      {items.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">No intents in queue</p>
          <p className="text-xs text-[var(--color-text-muted)]">
            New collaboration intents will appear here for admin review.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((intent) => (
            <article key={intent.id} className="card p-5 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                  {intent.intentType === "join" ? "Join Request" : "Recruitment Notice"}
                </h3>
                <TagPill
                  accent={
                    intent.status === "pending"
                      ? "info"
                      : intent.status === "approved"
                        ? "success"
                        : intent.status === "ignored"
                          ? "warning"
                          : "error"
                  }
                  mono
                  size="sm"
                  className="capitalize"
                >
                  {intent.status}
                </TagPill>
              </div>

              <div className="space-y-3 text-sm text-[var(--color-text-secondary)]">
                <div>
                  <div className="mb-1 text-[11px] font-mono uppercase tracking-[0.12em] text-[var(--color-text-tertiary)]">Who</div>
                  <p className="m-0 whitespace-pre-wrap">{intent.pitch || intent.message}</p>
                </div>
                {intent.whyYou ? (
                  <div>
                    <div className="mb-1 text-[11px] font-mono uppercase tracking-[0.12em] text-[var(--color-text-tertiary)]">Why</div>
                    <p className="m-0 whitespace-pre-wrap">{intent.whyYou}</p>
                  </div>
                ) : null}
                {intent.howCollab ? (
                  <div>
                    <div className="mb-1 text-[11px] font-mono uppercase tracking-[0.12em] text-[var(--color-text-tertiary)]">How</div>
                    <p className="m-0 whitespace-pre-wrap">{intent.howCollab}</p>
                  </div>
                ) : null}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs text-[var(--color-text-muted)]">
                <p>Project: {intent.projectId}</p>
                <p>Applicant: {intent.applicantId}</p>
                <p>Expires: {intent.expiresAt ? formatLocalizedDateTime(intent.expiresAt, language) : "—"}</p>
                <p>Legacy contact: {intent.contact ? intent.contact : "—"}</p>
              </div>

              {intent.status === "pending" ? (
                <AdminCollaborationReviewActions intentId={intent.id} />
              ) : (
                <p className="text-xs text-[var(--color-text-muted)]">
                  Reviewed by {intent.reviewedBy ?? "unknown"} at{" "}
                  {intent.reviewedAt ? formatLocalizedDateTime(intent.reviewedAt, language) : "N/A"}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
