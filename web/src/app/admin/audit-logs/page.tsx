import Link from "next/link";
import { Settings } from "lucide-react";
import { getAdminSessionForPage } from "@/lib/admin-auth";
import { listAuditLogs } from "@/lib/repository";

export default async function AdminAuditLogsPage() {
  const session = await getAdminSessionForPage();
  if (!session) return null;
  const { items, pagination } = await listAuditLogs({ page: 1, limit: 100 });

  return (
    <main className="p-8 space-y-6">
      <div className="flex items-center gap-3 border-b border-[var(--color-border)] pb-5">
        <Settings className="w-5 h-5 text-[var(--color-accent-cyan)]" />
        <div>
          <h1 className="text-lg font-bold text-[var(--color-text-primary)]">Audit Logs</h1>
          <p className="text-xs text-[var(--color-text-muted)]">{pagination.total} records</p>
        </div>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
              {["When", "Actor", "Action", "Entity", "Metadata"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border-subtle)]">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3 text-xs text-[var(--color-text-muted)]">{new Date(item.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3 font-mono text-xs text-[var(--color-text-secondary)]">{item.actorId}</td>
                <td className="px-4 py-3 text-[var(--color-text-primary)]">{item.action}</td>
                <td className="px-4 py-3 text-xs text-[var(--color-text-secondary)]">{item.entityType}:{item.entityId}</td>
                <td className="px-4 py-3 text-[10px] text-[var(--color-text-muted)]">{item.metadata ? JSON.stringify(item.metadata) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Link href="/admin" className="btn btn-ghost text-sm px-3 py-1.5 inline-flex w-fit">
        Back to dashboard
      </Link>
    </main>
  );
}
