import Link from "next/link";
import { Building2 } from "lucide-react";
import { getAdminSessionForPage } from "@/lib/admin-auth";
import { listEnterpriseProfiles } from "@/lib/repository";
import { listStoredAdminAiSuggestionsByTargets } from "@/lib/admin-ai";
import { AdminAiGenerateButton } from "@/components/admin-ai-generate-button";
import { AdminAiDecisionActions } from "@/components/admin-ai-decision-actions";
import { AdminEnterpriseReviewActions } from "@/components/admin-enterprise-review-actions";

export default async function AdminEnterprisePage() {
  const session = await getAdminSessionForPage();
  if (!session) return null;

  const { items, pagination } = await listEnterpriseProfiles({ status: "all", page: 1, limit: 100 });
  const aiMap = await listStoredAdminAiSuggestionsByTargets({
    targetType: "enterprise_verification",
    targetIds: items.map((item) => item.userId),
  });
  const rows = items.map((item) => ({ ...item, adminAi: aiMap.get(item.userId) }));

  return (
    <main className="p-8 space-y-6">
      <div className="flex items-center gap-3 border-b border-[var(--color-border)] pb-5">
        <Building2 className="w-5 h-5 text-[var(--color-success)]" />
        <div>
          <h1 className="text-lg font-bold text-[var(--color-text-primary)]">Enterprise verification</h1>
          <p className="text-xs text-[var(--color-text-muted)]">{pagination.total} profiles</p>
        </div>
      </div>

      <div className="space-y-4">
        {rows.map((item) => (
          <article key={item.userId} className="card p-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--color-text-primary)] m-0">{item.organizationName || 'Unknown organization'}</p>
                <p className="text-xs text-[var(--color-text-muted)] m-0 mt-1">Applicant: {item.userId} · Website: {item.organizationWebsite || '—'}</p>
              </div>
              <span className={`tag ${item.status === 'approved' ? 'tag-green' : item.status === 'pending' ? 'tag-yellow' : item.status === 'rejected' ? 'tag-red' : 'tag'} capitalize`}>{item.status}</span>
            </div>
            {item.useCase ? <p className="text-sm text-[var(--color-text-secondary)] m-0">{item.useCase}</p> : null}
            {item.adminAi ? (
              <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-3 space-y-2">
                <p className="text-[11px] font-semibold text-[var(--color-text-primary)] m-0">AI suggestion</p>
                <p className="text-xs text-[var(--color-text-secondary)] m-0">{item.adminAi.suggestion}</p>
                <p className="text-[10px] text-[var(--color-text-muted)] m-0">Risk: {item.adminAi.riskLevel} · Confidence: {item.adminAi.confidence?.toFixed(2) ?? 'n/a'}</p>
                <p className="text-[10px] text-[var(--color-text-muted)] m-0">Queue: {item.adminAi.queue ?? 'enterprise-verification'} · Priority: {item.adminAi.priority ?? 'normal'} · Decision: {item.adminAi.adminDecision}</p>
                {item.adminAi.labels?.length ? <div className="tag-row">{item.adminAi.labels.map((label) => <span key={label} className="tag">{label}</span>)}</div> : null}
                <AdminAiDecisionActions suggestionId={item.adminAi.id} currentDecision={item.adminAi.adminDecision} />
              </div>
            ) : (
              <AdminAiGenerateButton targetType="enterprise_verification" targetId={item.userId} task="verify_enterprise" label="Generate verification suggestion" />
            )}
            {item.status === 'pending' ? <AdminEnterpriseReviewActions applicationId={item.userId} /> : null}
          </article>
        ))}
      </div>
      <Link href="/admin" className="btn btn-ghost text-sm px-3 py-1.5 inline-flex w-fit">Back to overview</Link>
    </main>
  );
}
