import { redirect } from "next/navigation";
import { getSessionUserFromCookie } from "@/lib/auth";
import { listInAppNotifications } from "@/lib/repository";
import { Bell, BellOff } from "lucide-react";
import { NotificationsClient } from "./notifications-client";
import { getServerTranslator } from "@/lib/i18n";
import { EmptyState, PageHeader } from "@/components/ui";

export default async function NotificationsPage() {
  const session = await getSessionUserFromCookie();
  const { t } = await getServerTranslator();

  if (!session) {
    redirect("/login?redirect=/notifications");
  }

  const items = await listInAppNotifications({ userId: session.userId, limit: 80 });

  return (
    <main className="container max-w-3xl pb-24 pt-8 space-y-6">
      <PageHeader icon={Bell} title={t("notifications.title")} subtitle={t("notifications.summary")} />

      {items.length === 0 ? (
        <EmptyState icon={BellOff} title={t("notifications.empty_title")} description={t("notifications.empty_body")} block />
      ) : (
        <NotificationsClient initialItems={items} />
      )}
    </main>
  );
}
