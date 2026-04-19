"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell,
  Bot,
  FolderKanban,
  FolderOpenDot,
  LayoutGrid,
  Menu,
  Settings2,
  Users,
  X,
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
  const [drawerOpen, setDrawerOpen] = useState(false);

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
    setDrawerOpen(false);
  }, [pathname]);

  const primaryLinks = [
    { href: "/work/personal", label: "个人工作区", icon: LayoutGrid },
    { href: "/work/library", label: "项目库", icon: FolderOpenDot },
    { href: "/work/intents", label: "协作收件箱", icon: Users, badge: badges.receivedIntents },
    { href: "/work/agent-tasks", label: "Agent 任务", icon: Bot, badge: badges.pendingConfirmations },
    { href: "/work/notifications", label: "通知", icon: Bell, badge: badges.unreadNotifications },
    { href: "/settings", label: "设置", icon: Settings2 },
  ];

  const teamItems = workspaces.filter((item) => item.kind === "team" && item.teamSlug);

  function renderLink(item: { href: string; label: string; icon: typeof LayoutGrid; badge?: number }) {
    const Icon = item.icon;
    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={[
          "relative flex min-h-[2.75rem] items-center justify-between gap-3 rounded-[var(--radius-lg)] border px-3 py-2 transition-colors",
          active
            ? "border-[var(--color-border-strong)] bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]"
            : "border-transparent bg-transparent text-[var(--color-text-secondary)] hover:border-[var(--color-border)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)]",
        ].join(" ")}
      >
        {active ? <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-[var(--color-primary)]" /> : null}
        <span className="flex min-w-0 items-center gap-2.5">
          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="truncate text-sm">{item.label}</span>
        </span>
        <BadgePill count={item.badge} />
      </Link>
    );
  }

  function renderTeamLink(item: WorkspaceSummary) {
    const href = `/work/team/${encodeURIComponent(item.teamSlug!)}`;
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return (
      <Link
        key={item.id}
        href={href}
        className={[
          "relative flex min-h-[2.75rem] items-center justify-between gap-3 rounded-[var(--radius-lg)] border px-3 py-2 transition-colors",
          active
            ? "border-[var(--color-border-strong)] bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]"
            : "border-transparent bg-transparent text-[var(--color-text-secondary)] hover:border-[var(--color-border)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)]",
        ].join(" ")}
      >
        {active ? <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-[var(--color-primary)]" /> : null}
        <span className="flex min-w-0 items-center gap-2.5">
          <FolderKanban className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="truncate text-sm">{item.title}</span>
        </span>
        <BadgePill count={item.memberCount} />
      </Link>
    );
  }

  const navBody = (
    <div className="flex h-full flex-col">
      <div className="border-b border-[var(--color-border)] px-4 py-4">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[var(--color-success)]" />
          <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
            系统正常
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        <div className="px-2 pb-2 text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
          工作台
        </div>
        <nav className="space-y-1" aria-label="工作台导航">
          {primaryLinks.map(renderLink)}
        </nav>

        <div className="mt-5 px-2 pb-2 text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
          团队工作区
        </div>
        <div className="space-y-1">
          {teamItems.length > 0 ? (
            teamItems.map(renderTeamLink)
          ) : (
            <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] px-3 py-4 text-xs text-[var(--color-text-tertiary)]">
              你还没有加入团队工作区
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <main className="container pb-20 pt-6">
      <div className="mb-4 flex items-center gap-2 lg:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
          aria-label="打开工作台导航"
        >
          <Menu className="h-4 w-4" />
        </button>
        <div className="text-xs font-mono uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
          Workspace Console
        </div>
      </div>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
            aria-label="关闭工作台导航"
          />
          <aside className="absolute inset-y-0 left-0 flex w-[18rem] max-w-[86vw] flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-[var(--shadow-modal)]">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-4">
              <div className="text-sm font-semibold text-[var(--color-text-primary)]">工作台导航</div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-canvas)] text-[var(--color-text-secondary)]"
                aria-label="关闭导航抽屉"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {navBody}
          </aside>
        </div>
      ) : null}

      <div className="grid items-start gap-5 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)_300px]">
        <aside className="sticky top-20 hidden h-[calc(100vh-6rem)] overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] lg:flex">
          {navBody}
        </aside>

        <section className="min-w-0">{children}</section>

        <aside className="hidden xl:block xl:sticky xl:top-20">{aside ?? null}</aside>
      </div>
    </main>
  );
}
