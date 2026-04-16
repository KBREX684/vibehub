import Link from "next/link";
import { Cpu } from "lucide-react";
import { getAdminSessionForPage } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { isMockDataEnabled } from "@/lib/runtime-mode";

function queueForTarget(targetType: string) {
  switch (targetType) {
    case "report_ticket":
      return "reports-standard";
    case "enterprise_verification":
      return "enterprise-verification";
    case "post_review":
      return "moderation-standard";
    default:
      return "admin-review";
  }
}

export default async function AdminAiSuggestionsPage() {
  const session = await getAdminSessionForPage();
  if (!session) return null;

  const items = isMockDataEnabled()
    ? []
    : await prisma.adminAiSuggestion.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
      });

  return (
    <main className="p-8 space-y-6">
      <div className="flex items-center gap-3 border-b border-[var(--color-border)] pb-5">
        <Cpu className="w-5 h-5 text-[var(--color-primary-hover)]" />
        <div>
          <h1 className="text-lg font-bold text-[var(--color-text-primary)]">AI Suggestions</h1>
          <p className="text-xs text-[var(--color-text-muted)]">{items.length} stored suggestions</p>
        </div>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <article key={item.id} className="card p-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[var(--color-text-primary)] m-0">{item.targetType}</p>
              <span className={`tag ${item.riskLevel === "high" ? "tag-red" : item.riskLevel === "medium" ? "tag-yellow" : "tag-green"}`}>{item.riskLevel}</span>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] m-0">Target: {item.targetId}</p>
            <p className="text-sm text-[var(--color-text-secondary)] m-0">{item.suggestion}</p>
            <p className="text-[10px] text-[var(--color-text-muted)] m-0">
              Decision: {item.adminDecision} · Confidence: {item.confidence?.toFixed(2) ?? "n/a"} · {new Date(item.createdAt).toLocaleString()}
            </p>
            <p className="text-[10px] text-[var(--color-text-muted)] m-0">Suggested queue: {queueForTarget(item.targetType)}</p>
          </article>
        ))}
      </div>
      <Link href="/admin" className="btn btn-ghost text-sm px-3 py-1.5 inline-flex w-fit">
        Back to dashboard
      </Link>
    </main>
  );
}
