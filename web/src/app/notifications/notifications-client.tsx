"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  ArrowRight,
  BellDot,
  Bot,
  Bookmark,
  Check,
  CheckCheck,
  CheckCircle2,
  Heart,
  MessageSquare,
  ShieldAlert,
  Star,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { InAppNotification } from "@/lib/types";
import { useLanguage } from "@/app/context/LanguageContext";
import { formatLocalizedDateTime } from "@/lib/formatting";
import { groupNotificationsForDisplay } from "./notification-grouping";
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

  const unreadCount = items.filter((n) => !n.readAt).length;
  const displayRows = groupNotificationsForDisplay(items);

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
    <div className="space-y-4">
      {/* Controls */}
      {unreadCount > 0 && (
        <div className="flex items-center justify-between">
          <span
            data-testid="notifications-unread-count"
            className="text-xs text-[var(--color-text-muted)]"
          >
            {t("notifications.unread_count", `${unreadCount} unread`).replace("{count}", String(unreadCount))}
          </span>
          <button
            onClick={markAll}
            disabled={isPending}
            data-testid="notifications-mark-all-read"
            className="btn btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 disabled:opacity-100"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            {t("notifications.mark_all_read")}
          </button>
        </div>
      )}

      {/* Notification list */}
      <div className="space-y-2">
        {displayRows.map((row) => {
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

          return (
            <div
              key={primaryId}
              className={`card p-4 flex items-start gap-3 transition-all ${
                isUnread
                  ? "border-[var(--color-border-strong)] bg-[var(--color-bg-elevated)] shadow-[inset_3px_0_0_var(--color-primary)]"
                  : "border-[var(--color-border)] bg-[var(--color-bg-surface)]"
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

                {postSlug && row.kind === "post_liked" && (
                  <Link
                    href="/discover"
                    className="text-xs text-[var(--color-primary-hover)] hover:underline flex items-center gap-1"
                    onClick={() => isUnread && markOne(row.ids)}
                  >
                    打开发现页
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                )}

                {teamSlug && (
                  <Link
                    href={`/work/team/${encodeURIComponent(teamSlug)}`}
                    className="text-xs text-[var(--color-primary-hover)] hover:underline flex items-center gap-1"
                    onClick={() => isUnread && markOne(row.ids)}
                  >
                    {t("notifications.open_team")}
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                )}

                {confirmationRequestId && (
                  <Link
                    href={`/work/agent-tasks?confirmation=${encodeURIComponent(confirmationRequestId)}`}
                    className="text-xs text-[var(--color-primary-hover)] hover:underline flex items-center gap-1 mt-1"
                    onClick={() => isUnread && markOne(row.ids)}
                  >
                    {t("notifications.open_confirmation_queue", "Open confirmation queue")}
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
