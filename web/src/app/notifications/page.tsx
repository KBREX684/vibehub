import Link from "next/link";
import { getSessionUserFromCookie } from "@/lib/auth";
import { listInAppNotifications } from "@/lib/repository";
import { Bell, BellOff, ArrowRight, CheckCircle } from "lucide-react";

const KIND_ICONS: Record<string, string> = {
  team_join_request:   "👥",
  team_join_approved:  "✅",
  team_join_rejected:  "❌",
  team_task_assigned:  "📋",
  post_commented:      "💬",
  comment_replied:     "↩️",
  post_liked:          "❤️",
  project_bookmarked:  "🔖",
  user_followed:       "👤",
  project_intent_received: "🤝",
  post_featured:       "⭐",
};

export default async function NotificationsPage() {
  const session = await getSessionUserFromCookie();

  if (!session) {
    return (
      <main className="container max-w-2xl pb-24 pt-8">
        <div className="card p-10 text-center">
          <div className="w-12 h-12 rounded-[var(--radius-xl)] bg-[var(--color-bg-elevated)] flex items-center justify-center mx-auto mb-4">
            <Bell className="w-6 h-6 text-[var(--color-text-muted)]" />
          </div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
            Notifications
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mb-6">
            Sign in to view team join approvals, task assignments, and other alerts.
          </p>
          <a
            href="/api/v1/auth/github?redirect=/notifications"
            className="btn btn-primary text-sm px-6 py-2.5 inline-flex"
          >
            Sign in with GitHub
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </main>
    );
  }

  const items = await listInAppNotifications({ userId: session.userId, limit: 80 });
  const unreadCount = items.filter((n) => !n.readAt).length;

  return (
    <main className="container max-w-3xl pb-24 pt-8 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--color-primary-subtle)] flex items-center justify-center text-[var(--color-primary-hover)]">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Notifications</h1>
            <p className="text-xs text-[var(--color-text-muted)]">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button className="btn btn-ghost text-xs px-3 py-1.5 flex items-center gap-1.5 text-[var(--color-text-secondary)]">
            <CheckCircle className="w-3.5 h-3.5" />
            Mark all read
          </button>
        )}
      </div>

      {/* Notification list */}
      {items.length === 0 ? (
        <div className="card p-14 text-center">
          <BellOff className="w-10 h-10 text-[var(--color-text-muted)] mx-auto mb-4 opacity-50" />
          <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-2">
            No notifications yet
          </h3>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Join a team or submit a collaboration intent to get notified.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => {
            const isUnread = !n.readAt;
            const icon = KIND_ICONS[n.kind] ?? "🔔";
            const date = new Date(n.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });
            const teamSlug = typeof n.metadata?.teamSlug === "string" ? n.metadata.teamSlug : null;

            return (
              <div
                key={n.id}
                className={`card p-4 flex items-start gap-3 transition-all ${isUnread ? "border-[var(--color-primary)] bg-[var(--color-primary-subtle)]" : ""}`}
              >
                <span className="text-lg shrink-0 w-8 h-8 flex items-center justify-center">
                  {icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-0.5">
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">
                      {n.title}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      {isUnread && (
                        <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] shrink-0" />
                      )}
                      <span className="text-xs text-[var(--color-text-muted)]">{date}</span>
                    </div>
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)] mb-1">{n.body}</p>
                  {teamSlug && (
                    <Link
                      href={`/teams/${encodeURIComponent(teamSlug)}`}
                      className="text-xs text-[var(--color-primary-hover)] hover:underline flex items-center gap-1"
                    >
                      Open team
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
