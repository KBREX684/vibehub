import { redirect } from "next/navigation";
import { getAdminSessionForPage } from "@/lib/admin-auth";
import Link from "next/link";
import {
  ShieldAlert,
  Users,
  FileText,
  Link2,
  BarChart2,
  Cpu,
  Settings,
  Home,
  Building2,
  HeartPulse,
  LayoutDashboard,
} from "lucide-react";

const ADMIN_NAV_LINK_CLASS =
  "flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-md)] text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-overlay)] transition-colors";

const ADMIN_BADGE_CLASS =
  "inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest bg-[var(--color-error-subtle)] text-[var(--color-error)] border border-[var(--color-error-border)]";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSessionForPage();

  if (!session) {
    redirect("/login?required=admin");
  }

  const NAV = [
    { href: "/admin", label: "Home", icon: Home },
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/moderation", label: "Moderation", icon: FileText },
    { href: "/admin/collaboration", label: "Intents", icon: Link2 },
    { href: "/admin/enterprise", label: "Enterprise", icon: Building2 },
    { href: "/admin/reports", label: "Reports", icon: FileText },
    { href: "/admin/health", label: "Health", icon: HeartPulse },
    { href: "/admin/ai-suggestions", label: "AI suggestions", icon: Cpu },
    { href: "/admin/audit-logs", label: "Audit logs", icon: Settings },
    { href: "/admin/mcp-audits", label: "MCP audits", icon: BarChart2 },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-admin-bg)] flex">
      <aside className="w-56 shrink-0 border-r border-[var(--color-border-subtle)] flex flex-col">
        <div className="px-5 py-4 border-b border-[var(--color-border-subtle)]">
          <Link href="/" className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] mb-3">
            <Home className="w-3.5 h-3.5" />
            Back to site
          </Link>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[var(--color-error)]" />
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">Admin Console</span>
          </div>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">{session.name}</p>
        </div>
        <nav className="flex-1 px-3 py-3 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={ADMIN_NAV_LINK_CLASS}>
              <Icon className="w-3.5 h-3.5 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="px-5 py-3 border-t border-[var(--color-border-subtle)]">
          <span className={ADMIN_BADGE_CLASS}>
            <ShieldAlert className="w-2.5 h-2.5" aria-hidden="true" />
            Admin
          </span>
        </div>
      </aside>

      <div className="flex-1 min-w-0 overflow-auto">{children}</div>
    </div>
  );
}
