import { redirect } from "next/navigation";
import { Bell, BellOff } from "lucide-react";
import { getSessionUserFromCookie } from "@/lib/auth";
import { listInAppNotifications } from "@/lib/repository";
import { NotificationsClient } from "@/app/notifications/notifications-client";
import { EmptyState, PageHeader } from "@/components/ui";

export default async function WorkNotificationsPage() {
  const session = await getSessionUserFromCookie();
  if (!session) {
    redirect("/login?redirect=/work/notifications");
  }

  const items = await listInAppNotifications({ userId: session.userId, limit: 80 });

  return (
    <div className="space-y-5">
      <PageHeader icon={Bell} eyebrow="工作台" title="通知" subtitle="所有与工作台相关的提醒、系统信号和待处理事项都会回流到这里。" />
      {items.length === 0 ? (
        <EmptyState icon={BellOff} title="还没有通知" description="当任务、团队或智能代理需要你处理时，相应提醒会出现在这里。" />
      ) : (
        <NotificationsClient initialItems={items} />
      )}
    </div>
  );
}
