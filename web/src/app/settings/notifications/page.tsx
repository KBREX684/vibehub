import { redirect } from "next/navigation";
import { getSessionUserFromCookie } from "@/lib/auth";
import { getNotificationPreference } from "@/lib/repository";
import { getServerTranslator } from "@/lib/i18n";
import { NotificationPreferencesForm } from "./preferences-form";
import { Bell } from "lucide-react";

export default async function NotificationSettingsPage() {
  const session = await getSessionUserFromCookie();
  if (!session) redirect("/login?redirect=/settings/notifications");

  const { t } = await getServerTranslator();
  const initial = await getNotificationPreference(session.userId);

  return (
    <main className="container max-w-xl pb-24 pt-8 space-y-6">
      <div className="flex items-start gap-4 pb-6 border-b border-[var(--color-border)]">
        <div className="w-12 h-12 rounded-[var(--radius-lg)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-accent-cyan)]">
          <Bell className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] m-0">
            {t("settings.notifications_title", "Notifications")}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1 m-0">
            {t("settings.notifications_desc", "Choose which in-app notification categories you receive.")}
          </p>
        </div>
      </div>
      <NotificationPreferencesForm initial={initial} />
    </main>
  );
}
