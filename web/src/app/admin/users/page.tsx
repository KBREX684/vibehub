import { getAdminSessionForPage } from "@/lib/admin-auth";
import { listUsers } from "@/lib/repository";
import { Users } from "lucide-react";
import { TagPill } from "@/components/ui";

export default async function AdminUsersPage() {
  // Layout already guards — this is a defence-in-depth check
  const session = await getAdminSessionForPage();
  if (!session) return null;

  const { items, pagination } = await listUsers({ page: 1, limit: 200 });

  const ROLE_TAG: Record<string, "error" | "info" | "default"> = {
    admin: "error",
    user:  "info",
    guest: "default",
  };

  return (
    <main className="p-8 space-y-6">
      <div className="flex items-center gap-3 border-b border-[var(--color-border)] pb-5">
        <Users className="w-5 h-5 text-[var(--color-primary-hover)]" />
        <div>
          <h1 className="text-lg font-bold text-[var(--color-text-primary)]">User Management</h1>
          <p className="text-xs text-[var(--color-text-muted)]">{pagination.total} total users</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
              {["ID", "Name", "Email", "Role"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border-subtle)]">
            {items.map((u) => (
              <tr key={u.id} className="hover:bg-[var(--color-bg-elevated)] transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-[var(--color-text-muted)]">{u.id.slice(0, 12)}…</td>
                <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">{u.name}</td>
                <td className="px-4 py-3 text-[var(--color-text-secondary)]">{u.email}</td>
                <td className="px-4 py-3">
                  <TagPill accent={ROLE_TAG[u.role] ?? "default"} mono size="sm" className="capitalize">{u.role}</TagPill>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
