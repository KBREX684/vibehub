import Link from "next/link";
import { Cpu } from "lucide-react";
import { getAdminSessionForPage } from "@/lib/admin-auth";
import { listMcpInvokeAudits } from "@/lib/repository";

export default async function AdminMcpAuditsPage() {
  const session = await getAdminSessionForPage();
  if (!session) return null;
  const { items, total } = await listMcpInvokeAudits({ page: 1, limit: 100 });

  return (
    <main className="p-8 space-y-6">
      <div className="flex items-center gap-3 border-b border-[var(--color-border)] pb-5">
        <Cpu className="w-5 h-5 text-[var(--color-accent-violet)]" />
        <div>
          <h1 className="text-lg font-bold text-[var(--color-text-primary)]">MCP Invoke Audits</h1>
          <p className="text-xs text-[var(--color-text-muted)]">{total} records</p>
        </div>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <article key={item.id} className="card p-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[var(--color-text-primary)] m-0">{item.tool}</p>
              <span className={`tag ${item.httpStatus >= 400 ? "tag-red" : "tag-green"}`}>{item.httpStatus}</span>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] m-0">User: {item.userId} · API key: {item.apiKeyId ?? "session"}</p>
            <p className="text-xs text-[var(--color-text-muted)] m-0">
              {new Date(item.createdAt).toLocaleString()} · duration {item.durationMs ?? "n/a"}ms · {item.clientIp ?? "unknown ip"}
            </p>
            {item.errorCode ? <p className="text-xs text-[var(--color-error)] m-0">Error: {item.errorCode}</p> : null}
          </article>
        ))}
      </div>
      <Link href="/admin" className="btn btn-ghost text-sm px-3 py-1.5 inline-flex w-fit">
        Back to dashboard
      </Link>
    </main>
  );
}
