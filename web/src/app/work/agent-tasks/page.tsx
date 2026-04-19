import { redirect } from "next/navigation";
import { Bot } from "lucide-react";
import { getSessionUserFromCookie } from "@/lib/auth";
import { listWorkAgentTasks } from "@/lib/work-console";
import type { WorkAgentTaskStatus, WorkspaceKind } from "@/lib/types";
import { PageHeader } from "@/components/ui";
import { WorkAgentTasksClient } from "@/components/work-agent-tasks-client";
import { WorkViewTabs } from "@/components/work-view-tabs";

interface Props {
  searchParams?: Promise<{ status?: string; scope?: string; task?: string; confirmation?: string }>;
}

const STATUS_TABS = [
  { label: "全部", value: "default" },
  { label: "待确认", value: "pending_confirm" },
  { label: "已完成", value: "done" },
  { label: "失败", value: "failed" },
];

export default async function WorkAgentTasksPage({ searchParams }: Props) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    redirect("/login?redirect=/work/agent-tasks");
  }

  const sp = (await searchParams) ?? {};
  const status = sp.status as WorkAgentTaskStatus | undefined;
  const scope = sp.scope as WorkspaceKind | undefined;
  const items = await listWorkAgentTasks({ userId: session.userId, status, scope });

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Bot}
        eyebrow="工作台"
        title="智能代理任务"
        subtitle="集中查看所有涉及工作区的智能代理执行记录、审计链路和确认请求。"
      />

      <div className="flex flex-wrap items-center gap-3">
        <WorkViewTabs basePath="/work/agent-tasks" current={status ?? "default"} tabs={STATUS_TABS} paramName="status" />
      </div>
      <WorkAgentTasksClient
        items={items}
        initialTaskId={typeof sp.task === "string" ? sp.task : undefined}
        initialConfirmationId={typeof sp.confirmation === "string" ? sp.confirmation : undefined}
      />
    </div>
  );
}
