"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  Bell,
  Bot,
  FolderKanban,
  FolderOpenDot,
  LayoutGrid,
  Settings2,
  Users,
} from "lucide-react";
import type { WorkspaceSummary } from "@/lib/types";

const LAST_TEAM_WORKSPACE_KEY = "vibehub:last-team-workspace";

interface Props {
  workspaces: WorkspaceSummary[];
  badges: {
    unreadNotifications: number;
    pendingConfirmations: number;
    receivedIntents: number;
  };
  children: React.ReactNode;
  aside?: React.ReactNode;
}

function BadgePill({ count }: { count?: number }) {
  if (!count) return null;
  return (
    <span className="inline-flex min-w-[1.5rem] justify-center rounded-full border border-[var(--color-border-strong)] bg-[var(--color-bg-elevated)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--color-text-primary)]">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function WorkConsoleShell({ workspaces, badges, children, aside }: Props) {
  const pathname = usePathname();

  useEffect(() => {
    const match = pathname.match(/^\/work\/team\/([^/?#]+)/);
    if (!match) return;
    try {
      const slug = decodeURIComponent(match[1]);
      window.localStorage.setItem(LAST_TEAM_WORKSPACE_KEY, slug);
      document.cookie = `vibehub_last_team_workspace=${encodeURIComponent(slug)}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax`;
    } catch {
      // Ignore storage failures and keep the shell functional.
    }
  }, [pathname]);

  const primaryLinks = [
    { href: "/work/personal", label: "个人工作区", icon: LayoutGrid },
    { href: "/work/library", label: "项目库", icon: FolderOpenDot },
    { href: "/work/intents", label: "协作收件箱", icon: Users, badge: badges.receivedIntents },
    { href: "/work/agent-tasks", label: "Agent 任务", icon: Bot, badge: badges.pendingConfirmations },
    { href: "/work/notifications", label: "通知", icon: Bell, badge: badges.unreadNotifications },
    { href: "/settings", label: "设置", icon: Settings2 },
  ];

  return (
    <main className="container pb-20 pt-6">
      <div className="grid grid-cols-1 xl:grid-cols-[240px_minmax(0,1fr)_300px] gap-5 items-start">
        <aside className="xl:sticky xl:top-20 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-3">
          <div className="px-2 pb-2 text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
            工作台
          </div>
          <nav className="space-y-1" aria-label="工作台导航">
            {primaryLinks.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "flex min-h-[2.75rem] items-center justify-between gap-3 rounded-[var(--radius-lg)] border px-3 py-2 transition-colors",
                    active
                      ? "border-[var(--color-border-strong)] bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]"
                      : "border-transparent bg-transparent text-[var(--color-text-secondary)] hover:border-[var(--color-border)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)]",
                  ].join(" ")}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="truncate text-sm">{item.label}</span>
                  </span>
                  <BadgePill count={item.badge} />
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 border-t border-[var(--color-border)] pt-3">
            <div className="px-2 pb-2 text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
              团队工作区
            </div>
            <div className="space-y-1">
              {workspaces
                .filter((item) => item.kind === "team" && item.teamSlug)
                .map((item) => {
                  const href = `/work/team/${encodeURIComponent(item.teamSlug!)}`;
                  const active = pathname === href || pathname.startsWith(`${href}/`);
                  return (
                    <Link
                      key={item.id}
                      href={href}
                      className={[
                        "flex min-h-[2.75rem] items-center justify-between gap-3 rounded-[var(--radius-lg)] border px-3 py-2 transition-colors",
                        active
                          ? "border-[var(--color-border-strong)] bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]"
                          : "border-transparent bg-transparent text-[var(--color-text-secondary)] hover:border-[var(--color-border)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)]",
                      ].join(" ")}
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <FolderKanban className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span className="truncate text-sm">{item.title}</span>
                      </span>
                      <BadgePill count={item.memberCount} />
                    </Link>
                  );
                })}
            </div>
          </div>
        </aside>

        <section className="min-w-0">{children}</section>

        <aside className="hidden xl:block xl:sticky xl:top-20">{aside ?? null}</aside>
      </div>
    </main>
  );
}
