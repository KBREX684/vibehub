"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowRight, Check, CheckCheck } from "lucide-react";
import type { InAppNotification } from "@/lib/types";
import { useLanguage } from "@/app/context/LanguageContext";
import { groupNotificationsForDisplay } from "./notification-grouping";
import { apiFetch } from "@/lib/api-fetch";

const KIND_ICONS: Record<string, string> = {
  team_join_request:       "👥",
  team_join_approved:      "✅",
  team_join_rejected:      "❌",
  team_task_assigned:      "📋",
  post_commented:          "💬",
  comment_replied:         "↩️",
  post_liked:              "❤️",
  project_bookmarked:      "🔖",
  user_followed:           "👤",
  project_intent_received: "🤝",
  post_featured:           "⭐",
  collaboration_intent_status_update: "🤝",
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
  const { t } = useLanguage();
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
            className="btn btn-ghost text-xs px-3 py-1.5 flex items-center gap-1.5 text-[var(--color-text-secondary)] disabled:opacity-50"
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
          const icon = KIND_ICONS[row.kind] ?? "🔔";
          const date = new Date(row.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
          const teamSlug = typeof row.metadata?.teamSlug === "string" ? row.metadata.teamSlug : null;
          const postSlug = typeof row.metadata?.postSlug === "string" ? row.metadata.postSlug : null;

          return (
            <div
              key={primaryId}
              className={`card p-4 flex items-start gap-3 transition-all ${
                isUnread
                  ? "border-[var(--color-primary)] bg-[var(--color-primary-subtle)]"
                  : "opacity-70"
              }`}
            >
              <span className="text-lg shrink-0 w-8 h-8 flex items-center justify-center">
                {icon}
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
                        className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-success)] transition-colors"
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
                    href={`/discussions/${encodeURIComponent(postSlug)}`}
                    className="text-xs text-[var(--color-primary-hover)] hover:underline flex items-center gap-1"
                    onClick={() => isUnread && markOne(row.ids)}
                  >
                    {t("notifications.open_post")}
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                )}

                {teamSlug && (
                  <Link
                    href={`/teams/${encodeURIComponent(teamSlug)}`}
                    className="text-xs text-[var(--color-primary-hover)] hover:underline flex items-center gap-1"
                    onClick={() => isUnread && markOne(row.ids)}
                  >
                    {t("notifications.open_team")}
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
