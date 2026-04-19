import { redirect } from "next/navigation";
import { getSessionUserFromCookie } from "@/lib/auth";
import { listInAppNotifications } from "@/lib/repository";
import { NotificationsClient } from "@/app/notifications/notifications-client";

export default async function WorkNotificationsPage() {
  const session = await getSessionUserFromCookie();
  if (!session) {
    redirect("/login?redirect=/work/notifications");
  }

  const items = await listInAppNotifications({ userId: session.userId, limit: 80 });

  return <NotificationsClient initialItems={items} />;
}
