"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  BellDot,
  Bot,
  Bookmark,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronRight,
  Heart,
  Inbox,
  MessageSquare,
  PlayCircle,
  Settings2,
  ShieldAlert,
  Star,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { InAppNotification } from "@/lib/types";
import { useLanguage } from "@/app/context/LanguageContext";
import { formatLocalizedDateTime } from "@/lib/formatting";
import { groupNotificationsForDisplay, type NotificationDisplayRow } from "./notification-grouping";
import { apiFetch } from "@/lib/api-fetch";

const KIND_ICONS: Record<string, LucideIcon> = {
  team_join_request: Users,
  team_join_approved: CheckCircle2,
  team_join_rejected: ShieldAlert,
  team_task_assigned: Users,
  team_task_ready_for_review: CheckCircle2,
  team_task_reviewed: CheckCircle2,
  agent_confirmation_required: Bot,
  post_commented: MessageSquare,
  comment_replied: MessageSquare,
  post_liked: Heart,
  project_bookmarked: Bookmark,
  user_followed: UserPlus,
  project_intent_received: Users,
  post_featured: Star,
  collaboration_intent_status_update: Users,
};

const CATEGORY_META: Record<
  string,
  { label: string; icon: LucideIcon; kinds: string[]; description: string }
> = {
  intents: {
    label: "协作意向",
    icon: Inbox,
    kinds: ["project_intent_received", "collaboration_intent_status_update"],
    description: "有人申请加入你的项目，或你发出的协作意向状态发生变化。",
  },
  tasks: {
    label: "任务与评审",
    icon: CheckCircle2,
    kinds: ["team_task_assigned", "team_task_ready_for_review", "team_task_reviewed"],
    description: "团队任务分配、评审和状态变化会回流到这里。",
  },
  agents: {
    label: "Agent 确认",
    icon: Bot,
    kinds: ["agent_confirmation_required"],
    description: "需要人工确认的 Agent 动作会进入这个队列。",
  },
  teams: {
    label: "团队邀请",
    icon: Users,
    kinds: ["team_join_request", "team_join_approved", "team_join_rejected"],
    description: "涉及团队加入和审批结果的提醒。",
  },
  community: {
    label: "互动与曝光",
    icon: MessageSquare,
    kinds: ["post_commented", "comment_replied", "post_liked", "project_bookmarked", "user_followed", "post_featured"],
    description: "项目和内容被互动、收藏或推荐时会出现在这里。",
  },
  system: {
    label: "系统信号",
    icon: Settings2,
    kinds: [],
    description: "未能归类的系统级提醒与兼容通知。",
  },
};

function categoryForKind(kind: string) {
  const entry = Object.entries(CATEGORY_META).find(([, meta]) => meta.kinds.includes(kind));
  return entry?.[0] ?? "system";
}

function hrefForRow(row: NotificationDisplayRow) {
  const teamSlug = typeof row.metadata?.teamSlug === "string" ? row.metadata.teamSlug : null;
  const confirmationRequestId =
    typeof row.metadata?.confirmationRequestId === "string" ? row.metadata.confirmationRequestId : null;
  const projectSlug = typeof row.metadata?.projectSlug === "string" ? row.metadata.projectSlug : null;
  const postSlug = typeof row.metadata?.postSlug === "string" ? row.metadata.postSlug : null;

  if (confirmationRequestId) {
    return `/work/agent-tasks?confirmation=${encodeURIComponent(confirmationRequestId)}`;
  }
  if (teamSlug) {
    return `/work/team/${encodeURIComponent(teamSlug)}`;
  }
  if (projectSlug) {
    return `/p/${encodeURIComponent(projectSlug)}`;
  }
  if (postSlug) {
  return "/";
  }
  return "/work/notifications";
}

async function patchNotifications(ids?: string[], markAll?: boolean) {
  const body: Record<string, unknown> = {};
  if (markAll) body.markAll = true;
  else body.ids = ids;

  const res = await apiFetch("/api/v1/me/notifications", {
    method:  "PATCH",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to update notifications");
}

export function NotificationsClient({
  initialItems,
}: {
  initialItems: InAppNotification[];
}) {
  const { language, t } = useLanguage();
  const [items, setItems] = useState(initialItems);
  const [isPending, startTransition] = useTransition();
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const unreadCount = items.filter((n) => !n.readAt).length;
  const displayRows = groupNotificationsForDisplay(items);
  const rowsByCategory = useMemo(() => {
    const grouped = new Map<string, NotificationDisplayRow[]>();
    for (const row of displayRows) {
      const key = categoryForKind(row.kind);
      grouped.set(key, [...(grouped.get(key) ?? []), row]);
    }
    return grouped;
  }, [displayRows]);

  const categories = useMemo(() => {
    const all = [
      {
        id: "all",
        label: "全部通知",
        icon: BellDot,
        count: unreadCount,
        description: "统一查看协作、Agent、团队与系统相关提醒。",
      },
    ];
    for (const [id, meta] of Object.entries(CATEGORY_META)) {
      const rows = rowsByCategory.get(id) ?? [];
      if (rows.length === 0) continue;
      all.push({
        id,
        label: meta.label,
        icon: meta.icon,
        count: rows.filter((row) => !row.readAt).length,
        description: meta.description,
      });
    }
    return all;
  }, [rowsByCategory, unreadCount]);

  const visibleRows =
    activeCategory === "all" ? displayRows : (rowsByCategory.get(activeCategory) ?? []);

  const activeCategoryMeta = categories.find((item) => item.id === activeCategory) ?? categories[0];

  function markOne(ids: string[]) {
    const now = new Date().toISOString();
    const idSet = new Set(ids);
    setItems((prev) => prev.map((n) => (idSet.has(n.id) ? { ...n, readAt: now } : n)));
    startTransition(async () => {
      try {
        await patchNotifications(ids);
      } catch {
        setItems((prev) =>
          prev.map((n) => (idSet.has(n.id) ? { ...n, readAt: undefined } : n))
        );
      }
    });
  }

  function markAll() {
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? now })));
    startTransition(async () => {
      try {
        await patchNotifications(undefined, true);
      } catch {
        setItems(initialItems);
      }
    });
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-bg-surface)]">
      <div className="grid min-h-[38rem] grid-cols-1 md:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="border-b border-[var(--color-border)] bg-[var(--color-bg-canvas)]/60 md:border-b-0 md:border-r">
          <div className="hidden items-center justify-between border-b border-[var(--color-border)] px-4 py-4 md:flex">
            <div>
              <div className="text-sm font-semibold text-[var(--color-text-primary)]">通知中心</div>
              <div className="mt-1 text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
                分类视图
              </div>
            </div>
            {unreadCount > 0 ? (
              <span className="inline-flex min-w-[1.6rem] justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--color-text-primary)]">
                {unreadCount}
              </span>
            ) : null}
          </div>

          <div className="overflow-x-auto border-b border-[var(--color-border)] px-4 py-3 md:hidden hide-scrollbar">
            <div className="flex min-w-max items-center gap-2">
              {categories.map((category) => {
                const Icon = category.icon;
                const active = activeCategory === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setActiveCategory(category.id)}
                    className={[
                      "inline-flex items-center gap-2 whitespace-nowrap rounded-[var(--radius-pill)] border px-3 py-1.5 text-xs transition-colors",
                      active
                        ? "border-[var(--color-border-strong)] bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]"
                        : "border-[var(--color-border)] bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)]",
                    ].join(" ")}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {category.label}
                    {category.count > 0 ? <span className="font-mono">[{category.count}]</span> : null}
                  </button>
                );
              })}
            </div>
          </div>

          <nav className="hidden flex-col gap-1 p-3 md:flex" aria-label="通知分类">
            {categories.map((category) => {
              const Icon = category.icon;
              const active = activeCategory === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveCategory(category.id)}
                  className={[
                    "flex items-center justify-between rounded-[var(--radius-lg)] border px-3 py-2 text-left transition-colors",
                    active
                      ? "border-[var(--color-border-strong)] bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]"
                      : "border-transparent text-[var(--color-text-secondary)] hover:border-[var(--color-border)] hover:bg-[var(--color-bg-surface)] hover:text-[var(--color-text-primary)]",
                  ].join(" ")}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate text-sm">{category.label}</span>
                  </span>
                  {category.count > 0 ? (
                    <span className="inline-flex min-w-[1.4rem] justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg-canvas)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--color-text-primary)]">
                      {category.count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>

          {unreadCount > 0 ? (
            <div className="hidden border-t border-[var(--color-border)] p-4 md:block">
              <button
                onClick={markAll}
                disabled={isPending}
                data-testid="notifications-mark-all-read"
                className="btn btn-secondary flex w-full items-center justify-center gap-2 px-3 py-2 text-xs disabled:opacity-100"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                标记全部已读
              </button>
            </div>
          ) : null}
        </aside>

        <section className="min-w-0">
          <div className="border-b border-[var(--color-border)] px-4 py-4 md:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-lg font-semibold tracking-tight text-[var(--color-text-primary)]">
                  {activeCategoryMeta.label}
                </div>
                <p className="mt-1 max-w-xl text-sm text-[var(--color-text-secondary)]">
                  {activeCategoryMeta.description}
                </p>
              </div>
              {unreadCount > 0 ? (
                <div
                  data-testid="notifications-unread-count"
                  className="text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]"
                >
                  未读 {unreadCount}
                </div>
              ) : null}
            </div>
          </div>

          {visibleRows.length === 0 ? (
            <div className="px-6 py-10">
              <div className="flex min-h-[20rem] flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-canvas)]/50 px-6 py-10 text-center">
                <PlayCircle className="mb-4 h-8 w-8 text-[var(--color-text-tertiary)]" />
                <h3 className="m-0 text-sm font-semibold text-[var(--color-text-primary)]">当前分类暂无通知</h3>
                <p className="mt-2 max-w-sm text-xs leading-relaxed text-[var(--color-text-secondary)]">
                  新的协作、Agent 或团队事件进入这个分类时，会在这里显示。
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-border-subtle)]">
              {visibleRows.map((row) => {
          const primaryId = row.ids[0];
          const isUnread = !row.readAt;
          const Icon = KIND_ICONS[row.kind] ?? BellDot;
          const date = formatLocalizedDateTime(row.createdAt, language, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
          const teamSlug = typeof row.metadata?.teamSlug === "string" ? row.metadata.teamSlug : null;
          const postSlug = typeof row.metadata?.postSlug === "string" ? row.metadata.postSlug : null;
          const confirmationRequestId =
            typeof row.metadata?.confirmationRequestId === "string" ? row.metadata.confirmationRequestId : null;
          const href = hrefForRow(row);

          return (
            <div
              key={primaryId}
              className={`flex items-start gap-3 px-4 py-4 transition-colors md:px-6 ${
                isUnread
                  ? "bg-[var(--color-bg-elevated)]"
                  : "bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-elevated)]/60"
              }`}
            >
              <span className="shrink-0 flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)]">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-0.5">
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">
                    {row.title}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    {isUnread && (
                      <button
                        onClick={() => markOne(row.ids)}
                        data-testid={`notification-mark-read-${primaryId}`}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)] transition-colors"
                        title={t("notifications.mark_as_read")}
                        aria-label={t("notifications.mark_as_read")}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <span className="text-xs text-[var(--color-text-muted)]">{date}</span>
                  </div>
                </div>

                <p className="text-xs text-[var(--color-text-secondary)] mb-1">{row.body}</p>

                {teamSlug || postSlug || confirmationRequestId || href !== "/work/notifications" ? (
                  <Link
                    href={href}
                    className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--color-primary-hover)] hover:underline"
                    onClick={() => isUnread && markOne(row.ids)}
                  >
                    打开详情
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                ) : null}
              </div>
            </div>
          );
        })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
