import Link from "next/link";
import { Cpu } from "lucide-react";
import { getAdminSessionForPage } from "@/lib/admin-auth";
import { listMcpInvokeAudits } from "@/lib/repository";

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
  return query ? `/admin/mcp-audits?${query}` : "/admin/mcp-audits";
}

export default async function AdminMcpAuditsPage({ searchParams }: Props) {
  const session = await getAdminSessionForPage();
  if (!session) return null;

  const params = await searchParams;
  const tool = readString(params, "tool");
  const status = readString(params, "status") as "success" | "error" | undefined;
  const agentBindingId = readString(params, "agentBindingId");
  const dateFrom = readString(params, "dateFrom");
  const dateTo = readString(params, "dateTo");
  const page = Number(readString(params, "page") ?? "1") || 1;
  const limit = Number(readString(params, "limit") ?? "20") || 20;

  const result = await listMcpInvokeAudits({ tool, status, agentBindingId, dateFrom, dateTo, page, limit });
  const totalPages = Math.max(1, Math.ceil(result.total / limit));
  const baseParams = { tool, status, agentBindingId, dateFrom, dateTo, limit: String(limit) };

  return (
    <main className="p-8 space-y-6">
      <div className="flex items-center gap-3 border-b border-[var(--color-border)] pb-5">
        <Cpu className="w-5 h-5 text-[var(--color-accent-violet)]" />
        <div>
          <h1 className="text-lg font-bold text-[var(--color-text-primary)]">MCP invoke audits</h1>
          <p className="text-xs text-[var(--color-text-muted)]">{result.total} records</p>
        </div>
      </div>

      <form method="get" className="card p-4 grid gap-3 md:grid-cols-6">
        <label className="text-xs text-[var(--color-text-secondary)] flex flex-col gap-1">Tool
          <input name="tool" defaultValue={tool ?? ""} className="input-base text-sm" placeholder="search_projects" />
        </label>
        <label className="text-xs text-[var(--color-text-secondary)] flex flex-col gap-1">Status
          <select name="status" defaultValue={status ?? ""} className="input-base text-sm">
            <option value="">All</option>
            <option value="success">Success</option>
            <option value="error">Error</option>
          </select>
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
          <Link href="/admin/mcp-audits" className="btn btn-ghost text-sm px-4 py-2">Reset</Link>
        </div>
      </form>

      <div className="space-y-3">
        {result.items.length === 0 ? (
          <div className="card p-8 text-center text-sm text-[var(--color-text-secondary)]">No MCP audits match the current filters.</div>
        ) : (
          result.items.map((item) => (
            <article key={item.id} className="card p-4 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-[var(--color-text-primary)] m-0">{item.tool}</p>
                <span className={`tag ${item.httpStatus >= 400 ? 'tag-red' : 'tag-green'}`}>{item.httpStatus}</span>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)] m-0">User: {item.userId} · Auth: {item.apiKeyId ? `api_key:${item.apiKeyId}` : 'session'} · Agent: {item.agentBindingId ?? '—'}</p>
              <p className="text-xs text-[var(--color-text-muted)] m-0">{new Date(item.createdAt).toLocaleString()} · Duration {item.durationMs ?? 'n/a'}ms · {item.clientIp ?? 'unknown ip'}</p>
              {item.errorCode ? <p className="text-xs text-[var(--color-error)] m-0">Error: {item.errorCode}</p> : null}
            </article>
          ))
        )}
      </div>

      <div className="flex items-center justify-between gap-3 text-xs text-[var(--color-text-muted)]">
        <span>Page {page} / {totalPages}</span>
        <div className="flex items-center gap-2">
          {page > 1 ? <Link href={buildHref(baseParams, { page: String(page - 1) })} className="btn btn-ghost text-xs px-3 py-1.5">Previous</Link> : null}
          {page < totalPages ? <Link href={buildHref(baseParams, { page: String(page + 1) })} className="btn btn-ghost text-xs px-3 py-1.5">Next</Link> : null}
        </div>
      </div>
    </main>
  );
}
