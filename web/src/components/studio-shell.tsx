"use client";

/**
 * StudioShell — v11 personal workspace shell.
 *
 * Left sidebar with 5 entries: Studio / Ledger / Card / Agent 绑定 / Settings.
 * Quota card shows monthly Ledger count with progress bar.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { useLanguage } from "@/app/context/LanguageContext";
import { Bot } from "lucide-react";
import {
  Compass,
  Receipt,
  User,
  Settings,
} from "lucide-react";

/* v11.1 warm: active uses primary (Sienna) subtle + primary text */
const SIDEBAR_LINK_CLASS =
  "flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-md)] text-xs font-medium transition-all duration-120";
const SIDEBAR_LINK_ACTIVE_CLASS =
  "text-[var(--color-primary)] bg-[var(--color-primary-subtle)] border border-[var(--color-primary-border)]";
const SIDEBAR_LINK_INACTIVE_CLASS =
  "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-overlay)] border border-transparent";

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
    { href: "/settings/agents", label: "Agent 绑定", icon: Bot },
    { href: "/settings", label: t("nav.settings", "设置"), icon: Settings },
  ];

  function isActive(href: string): boolean {
    if (href === "/studio") return pathname === "/studio" || pathname.startsWith("/studio?");
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  // Mock quota data - in production this would come from API
  const monthlyLedgerCount = 348;
  const monthlyLedgerLimit = Infinity; // Pro user
  const isPro = true;

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      {/* Left sidebar */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-[var(--color-border-subtle)] bg-[var(--color-bg-canvas)] py-6 px-3">
        {/* Logo */}
        <div className="px-3 mb-6">
          <Link href="/" className="flex items-center gap-2 text-[var(--color-text-primary)]">
            <Compass className="w-5 h-5" />
            <span className="font-semibold text-sm">VibeHub</span>
          </Link>
        </div>

        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${SIDEBAR_LINK_CLASS} ${active ? SIDEBAR_LINK_ACTIVE_CLASS : SIDEBAR_LINK_INACTIVE_CLASS}`}
              >
                <Icon className="w-[18px] h-[18px]" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Quota Card */}
        <div className="mt-auto pt-4 px-1">
          <div className="rounded-[var(--radius-lg)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] p-3 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-text-tertiary)]">
                本月 Ledger
              </span>
              <span className="text-[11px] font-mono font-medium text-[var(--color-primary)]">
                {monthlyLedgerCount} / {isPro ? "∞" : monthlyLedgerLimit}
              </span>
            </div>

            {/* Progress bar - only for Free users */}
            {!isPro && (
              <>
                <div className="h-[2px] bg-[var(--color-bg-surface)] rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-[var(--color-primary)] transition-all duration-300"
                    style={{ width: `${Math.min((monthlyLedgerCount / monthlyLedgerLimit) * 100, 100)}%` }}
                  />
                </div>

                {monthlyLedgerCount >= 80 && (
                  <Link
                    href="/pricing"
                    className="text-[10px] font-medium text-[var(--color-primary)] hover:underline"
                  >
                    升级 Pro 解锁无限 →
                  </Link>
                )}
              </>
            )}

            {isPro && (
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)]" />
                <span className="text-[10px] text-[var(--color-text-tertiary)]">Pro 无限额度</span>
              </div>
            )}
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
