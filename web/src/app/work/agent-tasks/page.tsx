import { redirect } from "next/navigation";
import { Cpu, Filter } from "lucide-react";
import { getSessionUserFromCookie } from "@/lib/auth";
import { listWorkAgentTasks } from "@/lib/work-console";
import type { WorkAgentTaskStatus, WorkspaceKind } from "@/lib/types";
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
      <section className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-4 py-5 md:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
              Agent Console
            </div>
            <div>
              <h1 className="m-0 text-xl font-semibold tracking-tight text-[var(--color-text-primary)]">智能代理任务</h1>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                集中查看所有涉及工作区的智能代理执行记录、确认请求与最终结果。
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-[0.12em] text-[var(--color-text-tertiary)]">
            <span className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] border border-[var(--color-border)] bg-[var(--color-bg-canvas)] px-2.5 py-1">
              <Cpu className="h-3.5 w-3.5" />
              任务数 {items.length}
            </span>
            <span className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] border border-[var(--color-border)] bg-[var(--color-bg-canvas)] px-2.5 py-1">
              <Filter className="h-3.5 w-3.5" />
              {scope === "team" ? "团队范围" : scope === "personal" ? "个人范围" : "全部范围"}
            </span>
          </div>
        </div>
      </section>

      <WorkViewTabs basePath="/work/agent-tasks" current={status ?? "default"} tabs={STATUS_TABS} paramName="status" />
      <WorkAgentTasksClient
        items={items}
        initialTaskId={typeof sp.task === "string" ? sp.task : undefined}
        initialConfirmationId={typeof sp.confirmation === "string" ? sp.confirmation : undefined}
      />
    </div>
  );
}
