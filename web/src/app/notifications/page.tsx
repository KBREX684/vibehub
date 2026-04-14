import { redirect } from "next/navigation";
import { getSessionUserFromCookie } from "@/lib/auth";
import { listInAppNotifications } from "@/lib/repository";
import { Bell, BellOff } from "lucide-react";
import { NotificationsClient } from "./notifications-client";

export default async function NotificationsPage() {
  const session = await getSessionUserFromCookie();

  if (!session) {
    redirect("/login?redirect=/notifications");
  }

  const items = await listInAppNotifications({ userId: session.userId, limit: 80 });

  return (
    <main className="container max-w-3xl pb-24 pt-8 space-y-6">
      <div className="flex items-center justify-between pb-5 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--color-primary-subtle)] flex items-center justify-center text-[var(--color-primary-hover)]">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Notifications</h1>
            <p className="text-xs text-[var(--color-text-muted)]">
              {items.filter((n) => !n.readAt).length} unread
            </p>
          </div>
        </div>
      </div>

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
        <NotificationsClient initialItems={items} />
      )}
    </main>
  );
}
