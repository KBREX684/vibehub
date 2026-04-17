import Link from "next/link";
import { Flag } from "lucide-react";
import { getAdminSessionForPage } from "@/lib/admin-auth";
import { listReportTickets } from "@/lib/repository";
import { AdminReportResolveActions } from "@/components/admin-report-resolve-actions";
import { AdminAiGenerateButton } from "@/components/admin-ai-generate-button";
import { AdminAiDecisionActions } from "@/components/admin-ai-decision-actions";

export default async function AdminReportsPage() {
  const session = await getAdminSessionForPage();
  if (!session) return null;

  const { items, pagination } = await listReportTickets({ status: "all", page: 1, limit: 100, forAdmin: true });

  return (
    <main className="p-8 space-y-6">
      <div className="flex items-center gap-3 border-b border-[var(--color-border)] pb-5">
        <Flag className="w-5 h-5 text-[var(--color-error)]" />
        <div>
          <h1 className="text-lg font-bold text-[var(--color-text-primary)]">Report tickets</h1>
          <p className="text-xs text-[var(--color-text-muted)]">{pagination.total} total tickets</p>
        </div>
      </div>

      <div className="space-y-4">
        {items.map((ticket) => (
          <article key={ticket.id} className="card p-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--color-text-primary)] m-0">Report {ticket.id.slice(0, 10)}...</p>
                <p className="text-xs text-[var(--color-text-muted)] m-0 mt-1">Target post: {ticket.targetId} · Reporter: {ticket.reporterId}</p>
              </div>
              <span className={`tag ${ticket.status === 'open' ? 'tag-red' : 'tag-green'} capitalize`}>{ticket.status}</span>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] m-0">{ticket.reason}</p>
            {ticket.adminAi ? (
              <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-3 space-y-2">
                <p className="text-[11px] font-semibold text-[var(--color-text-primary)] m-0">AI suggestion</p>
                <p className="text-xs text-[var(--color-text-secondary)] m-0">{ticket.adminAi.suggestion}</p>
                <p className="text-[10px] text-[var(--color-text-muted)] m-0">Risk: {ticket.adminAi.riskLevel} · Confidence: {ticket.adminAi.confidence?.toFixed(2) ?? 'n/a'}</p>
                <p className="text-[10px] text-[var(--color-text-muted)] m-0">Queue: {ticket.adminAi.queue ?? 'reports-standard'} · Priority: {ticket.adminAi.priority ?? 'normal'} · Decision: {ticket.adminAi.adminDecision}</p>
                {ticket.adminAi.labels?.length ? <div className="tag-row">{ticket.adminAi.labels.map((label) => <span key={label} className="tag">{label}</span>)}</div> : null}
                <AdminAiDecisionActions suggestionId={ticket.adminAi.id} currentDecision={ticket.adminAi.adminDecision} />
              </div>
            ) : (
              <AdminAiGenerateButton targetType="report_ticket" targetId={ticket.id} task="summarize_report" label="Generate report summary" />
            )}
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-[var(--color-text-muted)] m-0">
                Created {new Date(ticket.createdAt).toLocaleString()}
                {ticket.resolvedAt ? ` · Resolved ${new Date(ticket.resolvedAt).toLocaleString()}` : ""}
              </p>
              {ticket.status === "open" ? <AdminReportResolveActions reportId={ticket.id} /> : <span className="text-xs text-[var(--color-text-muted)]">Closed by {ticket.resolvedBy ?? 'admin'}</span>}
            </div>
          </article>
        ))}
      </div>
      <Link href="/admin" className="btn btn-ghost text-sm px-3 py-1.5 inline-flex w-fit">Back to overview</Link>
    </main>
  );
}
