import Link from "next/link";
import { Settings } from "lucide-react";
import { getAdminSessionForPage } from "@/lib/admin-auth";
import { listAuditLogs } from "@/lib/repository";

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
  return query ? `/admin/audit-logs?${query}` : "/admin/audit-logs";
}

export default async function AdminAuditLogsPage({ searchParams }: Props) {
  const session = await getAdminSessionForPage();
  if (!session) return null;

  const params = await searchParams;
  const actorId = readString(params, "actorId");
  const action = readString(params, "action");
  const agentBindingId = readString(params, "agentBindingId");
  const dateFrom = readString(params, "dateFrom");
  const dateTo = readString(params, "dateTo");
  const page = Number(readString(params, "page") ?? "1") || 1;
  const limit = Number(readString(params, "limit") ?? "20") || 20;
  const result = await listAuditLogs({ actorId, action, agentBindingId, dateFrom, dateTo, page, limit });
  const baseParams = { actorId, action, agentBindingId, dateFrom, dateTo, limit: String(result.pagination.limit) };

  return (
    <main className="p-8 space-y-6">
      <div className="flex items-center gap-3 border-b border-[var(--color-border)] pb-5">
        <Settings className="w-5 h-5 text-[var(--color-accent-cyan)]" />
        <div>
          <h1 className="text-lg font-bold text-[var(--color-text-primary)]">Audit logs</h1>
          <p className="text-xs text-[var(--color-text-muted)]">{result.pagination.total} records</p>
        </div>
      </div>

      <form method="get" className="card p-4 grid gap-3 md:grid-cols-6">
        <label className="text-xs text-[var(--color-text-secondary)] flex flex-col gap-1">Actor
          <input name="actorId" defaultValue={actorId ?? ""} className="input-base text-sm" placeholder="u1" />
        </label>
        <label className="text-xs text-[var(--color-text-secondary)] flex flex-col gap-1">Action
          <input name="action" defaultValue={action ?? ""} className="input-base text-sm" placeholder="post_reviewed" />
        </label>
        <label className="text-xs text-[var(--color-text-secondary)] flex flex-col gap-1">Agent binding
          <input name="agentBindingId" defaultValue={agentBindingId ?? ""} className="input-base text-sm" placeholder="binding_x" />
        </label>
        <label className="text-xs text-[var(--color-text-secondary)] flex flex-col gap-1">From
          <input name="dateFrom" type="datetime-local" defaultValue={dateFrom ?? ""} className="input-base text-sm" />
        </label>
        <label className="text-xs text-[var(--color-text-secondary)] flex flex-col gap-1">To
          <input name="dateTo" type="datetime-local" defaultValue={dateTo ?? ""} className="input-base text-sm" />
        </label>
        <div className="flex items-end gap-2">
          <button type="submit" className="btn btn-primary text-sm px-4 py-2">Apply</button>
          <Link href="/admin/audit-logs" className="btn btn-ghost text-sm px-4 py-2">Reset</Link>
        </div>
      </form>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
              {['When', 'Actor', 'Action', 'Entity', 'Agent', 'Metadata'].map((header) => (
                <th key={header} className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border-subtle)]">
            {result.items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3 text-xs text-[var(--color-text-muted)]">{new Date(item.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3 font-mono text-xs text-[var(--color-text-secondary)]">{item.actorId}</td>
                <td className="px-4 py-3 text-[var(--color-text-primary)]">{item.action}</td>
                <td className="px-4 py-3 text-xs text-[var(--color-text-secondary)]">{item.entityType}:{item.entityId}</td>
                <td className="px-4 py-3 text-xs text-[var(--color-text-secondary)]">{item.agentBindingId ?? '—'}</td>
                <td className="px-4 py-3 text-[10px] text-[var(--color-text-muted)]">{item.metadata ? JSON.stringify(item.metadata) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
