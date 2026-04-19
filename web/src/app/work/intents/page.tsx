import { redirect } from "next/navigation";
import { Inbox } from "lucide-react";
import { getSessionUserFromCookie } from "@/lib/auth";
import { listWorkCollaborationInbox } from "@/lib/work-console";
import type { WorkIntentTab } from "@/lib/types";
import { EmptyState, PageHeader } from "@/components/ui";
import { WorkIntentsClient } from "@/components/work-intents-client";
import { WorkViewTabs } from "@/components/work-view-tabs";

interface Props {
  searchParams?: Promise<{ tab?: string }>;
}

const TABS = [
  { label: "收到的", value: "received" },
  { label: "我发出的", value: "sent" },
  { label: "已接受", value: "accepted" },
  { label: "已婉拒", value: "declined" },
  { label: "已过期", value: "expired" },
];

export default async function WorkIntentsPage({ searchParams }: Props) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    redirect("/login?redirect=/work/intents");
  }

  const sp = (await searchParams) ?? {};
  const tab = (sp.tab as WorkIntentTab | undefined) ?? "received";
  const items = await listWorkCollaborationInbox({ userId: session.userId, tab });

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Inbox}
        eyebrow="工作台"
        title="协作收件箱"
        subtitle="统一查看收到的协作请求、已发出的意向和已处理结果。"
      />

      <WorkViewTabs basePath="/work/intents" current={tab} tabs={TABS} paramName="tab" />

      {items.length === 0 ? (
        <EmptyState
          title="当前收件箱为空"
          description="当有人回应你的项目，或你主动发出协作意向后，对应记录会出现在这里。"
        />
      ) : (
        <WorkIntentsClient items={items} tab={tab} />
      )}
    </div>
  );
}
