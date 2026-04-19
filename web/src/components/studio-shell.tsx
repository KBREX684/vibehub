"use client";

/**
 * StudioShell — v11 personal workspace shell.
 *
 * Left sidebar with 4 entries: Studio / Ledger / Card / Settings.
 * Badge shows monthly Ledger count.
 * Modeled after admin/layout.tsx sidebar pattern.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { useLanguage } from "@/app/context/LanguageContext";
import {
  Compass,
  Receipt,
  User,
  Settings,
} from "lucide-react";

const SIDEBAR_LINK_CLASS =
  "flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-md)] text-xs font-medium transition-colors";
const SIDEBAR_LINK_ACTIVE_CLASS =
  "text-[var(--color-text-primary)] bg-[var(--color-surface-overlay)]";
const SIDEBAR_LINK_INACTIVE_CLASS =
  "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-overlay)]";

interface StudioShellProps {
  children: React.ReactNode;
}

export function StudioShell({ children }: StudioShellProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { t } = useLanguage();

  const userSlug = user?.name?.toLowerCase().replace(/\s+/g, "-") ?? "anonymous";

  const navItems = [
    { href: "/studio", label: t("nav.studio", "Studio"), icon: Compass },
    { href: "/ledger", label: t("nav.ledger", "Ledger"), icon: Receipt },
    { href: `/u/${userSlug}`, label: t("nav.card", "Card"), icon: User },
    { href: "/settings", label: t("nav.settings", "设置"), icon: Settings },
  ];

  function isActive(href: string): boolean {
    if (href === "/studio") return pathname === "/studio" || pathname.startsWith("/studio?");
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      {/* Left sidebar */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-bg-canvas)] py-4 px-3">
        <nav className="flex flex-col gap-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${SIDEBAR_LINK_CLASS} ${active ? SIDEBAR_LINK_ACTIVE_CLASS : SIDEBAR_LINK_INACTIVE_CLASS}`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom badge */}
        <div className="mt-auto pt-4 border-t border-[var(--color-border)]">
          <div className="px-3 py-2 text-[10px] font-mono text-[var(--color-text-muted)]">
            <span className="text-[var(--color-text-secondary)]">本月 Ledger：</span>
            <span className="text-[var(--color-accent-apple)]">348</span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}
