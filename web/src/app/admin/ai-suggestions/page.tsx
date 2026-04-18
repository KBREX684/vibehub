import Link from "next/link";
import { Cpu } from "lucide-react";
import { getAdminSessionForPage } from "@/lib/admin-auth";
import { listAdminAiSuggestions } from "@/lib/admin-ai";
import { AdminAiDecisionActions } from "@/components/admin-ai-decision-actions";
import type { AdminAiDecisionValue, AdminAiSuggestionTargetValue } from "@/lib/types";
import { TagPill } from "@/components/ui";
import { formatLocalizedDateTime } from "@/lib/formatting";
import { getServerLanguage } from "@/lib/i18n";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function readString(params: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const value = params[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function buildHref(base: Record<string, string | undefined>, overrides: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...base, ...overrides })) {
    if (value) search.set(key, value);
  }
  const query = search.toString();
  return query ? `/admin/ai-suggestions?${query}` : "/admin/ai-suggestions";
}

const TARGETS: AdminAiSuggestionTargetValue[] = ["report_ticket", "post_review", "enterprise_verification", "other"];
const DECISIONS: AdminAiDecisionValue[] = ["pending", "accepted", "modified", "rejected"];
const RISKS = ["low", "medium", "high"] as const;

export default async function AdminAiSuggestionsPage({ searchParams }: Props) {
  const session = await getAdminSessionForPage();
  if (!session) return null;
  const language = await getServerLanguage();

  const params = await searchParams;
  const targetType = readString(params, "targetType") as AdminAiSuggestionTargetValue | undefined;
  const riskLevel = readString(params, "riskLevel") as (typeof RISKS)[number] | undefined;
  const adminDecision = readString(params, "adminDecision") as AdminAiDecisionValue | undefined;
  const queue = readString(params, "queue");
  const page = Number(readString(params, "page") ?? "1") || 1;
  const limit = Number(readString(params, "limit") ?? "20") || 20;

  const result = await listAdminAiSuggestions({ targetType, riskLevel, adminDecision, queue, page, limit });
  const baseParams = {
    targetType,
    riskLevel,
    adminDecision,
    queue,
    limit: String(result.pagination.limit),
  };

  return (
    <main className="p-8 space-y-6">
      <div className="flex items-center gap-3 border-b border-[var(--color-border)] pb-5">
        <Cpu className="w-5 h-5 text-[var(--color-primary-hover)]" />
        <div>
          <h1 className="text-lg font-bold text-[var(--color-text-primary)]">AI suggestions</h1>
          <p className="text-xs text-[var(--color-text-muted)]">{result.pagination.total} stored suggestions</p>
        </div>
      </div>

      <form method="get" className="card p-4 grid gap-3 md:grid-cols-5">
        <label className="text-xs text-[var(--color-text-secondary)] flex flex-col gap-1">
          Target type
          <select name="targetType" defaultValue={targetType ?? ""} className="input-base text-sm">
            <option value="">All</option>
            {TARGETS.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-[var(--color-text-secondary)] flex flex-col gap-1">
          Risk level
          <select name="riskLevel" defaultValue={riskLevel ?? ""} className="input-base text-sm">
            <option value="">All</option>
            {RISKS.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-[var(--color-text-secondary)] flex flex-col gap-1">
          Decision
          <select name="adminDecision" defaultValue={adminDecision ?? ""} className="input-base text-sm">
            <option value="">All</option>
            {DECISIONS.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-[var(--color-text-secondary)] flex flex-col gap-1">
          Queue
          <input name="queue" defaultValue={queue ?? ""} className="input-base text-sm" placeholder="reports-standard" />
        </label>
        <div className="flex items-end gap-2">
          <button type="submit" className="btn btn-primary text-sm px-4 py-2">Apply</button>
          <Link href="/admin/ai-suggestions" className="btn btn-ghost text-sm px-4 py-2">Reset</Link>
        </div>
      </form>

      <div className="space-y-4">
        {result.items.length === 0 ? (
          <div className="card p-8 text-center text-sm text-[var(--color-text-secondary)]">No AI suggestions match the current filters.</div>
        ) : (
          result.items.map((item) => (
            <article key={item.id} className="card p-5 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text-primary)] m-0">{item.targetType}</p>
                  <p className="text-xs text-[var(--color-text-muted)] m-0 mt-1">Target: {item.targetId}</p>
                </div>
                <TagPill accent={item.riskLevel === "high" ? "error" : item.riskLevel === "medium" ? "warning" : "success"} mono size="sm">{item.riskLevel}</TagPill>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] m-0">{item.suggestion}</p>
              <p className="text-[11px] text-[var(--color-text-muted)] m-0">
                Queue: {item.queue ?? "admin-review"} · Priority: {item.priority ?? "normal"} · Confidence: {item.confidence?.toFixed(2) ?? "n/a"}
              </p>
              <p className="text-[11px] text-[var(--color-text-muted)] m-0">
                Decision: {item.adminDecision} · Provider: {item.modelProvider ?? "heuristic"}
                {item.modelName ? `/${item.modelName}` : ""}
                {item.decidedAt ? ` · Decided ${formatLocalizedDateTime(item.decidedAt, language)}` : ""}
              </p>
              {item.labels?.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {item.labels.map((label) => (
                    <TagPill key={label} accent="default" mono size="sm">{label}</TagPill>
                  ))}
                </div>
              ) : null}
              {item.decisionNote ? <p className="text-xs text-[var(--color-text-secondary)] m-0">Decision note: {item.decisionNote}</p> : null}
              <AdminAiDecisionActions suggestionId={item.id} currentDecision={item.adminDecision} />
            </article>
          ))
        )}
      </div>

      <div className="flex items-center justify-between gap-3 text-xs text-[var(--color-text-muted)]">
        <span>Page {result.pagination.page} / {result.pagination.totalPages}</span>
        <div className="flex items-center gap-2">
          {result.pagination.page > 1 ? <Link href={buildHref(baseParams, { page: String(result.pagination.page - 1) })} className="btn btn-ghost text-xs px-3 py-1.5">Previous</Link> : null}
          {result.pagination.page < result.pagination.totalPages ? <Link href={buildHref(baseParams, { page: String(result.pagination.page + 1) })} className="btn btn-ghost text-xs px-3 py-1.5">Next</Link> : null}
        </div>
      </div>
    </main>
  );
}
