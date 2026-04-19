import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, Bot, FilePlus2, Inbox, Upload } from "lucide-react";
import { getSessionUserFromCookie } from "@/lib/auth";
import { listInAppNotifications } from "@/lib/repository";
import {
  ensurePersonalWorkspace,
  listWorkspaceArtifacts,
  listWorkspaceDeliverables,
  listWorkspaceProjects,
  listWorkspaceSnapshots,
} from "@/lib/repositories/workspace.repository";
import { WorkspaceArtifactsPanel } from "@/components/workspace-artifacts-panel";
import { listWorkAgentTasks, listWorkCollaborationInbox, listWorkLibraryItems } from "@/lib/work-console";
import { WorkspaceDeliverablesPanel } from "@/components/workspace-deliverables-panel";
import { WorkspaceSnapshotsPanel } from "@/components/workspace-snapshots-panel";
import { EmptyState, SectionCard, TagPill } from "@/components/ui";
import { WorkViewTabs } from "@/components/work-view-tabs";
import { WorkspaceTopBar } from "@/components/workspace-top-bar";

interface Props {
  searchParams?: Promise<{ view?: string }>;
}

const TABS = [
  { label: "概览", value: "overview" },
  { label: "文件", value: "files" },
  { label: "快照", value: "snapshots" },
  { label: "交付包", value: "deliverables" },
  { label: "信号", value: "signals" },
];

export default async function PersonalWorkspacePage({ searchParams }: Props) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    redirect("/login?redirect=/work/personal");
  }
  const sp = (await searchParams) ?? {};
  const view = sp.view ?? "overview";

  const workspace = await ensurePersonalWorkspace(session.userId);
  const [projects, notifications, intents, agentTasks, artifactsState, workspaceProjects, snapshots, deliverables] = await Promise.all([
    listWorkLibraryItems({ userId: session.userId }),
    listInAppNotifications({ userId: session.userId, limit: 8 }),
    listWorkCollaborationInbox({ userId: session.userId, tab: "sent" }),
    listWorkAgentTasks({ userId: session.userId }),
    listWorkspaceArtifacts({ userId: session.userId, workspaceId: workspace.id }),
    listWorkspaceProjects({ userId: session.userId, workspaceId: workspace.id }),
    listWorkspaceSnapshots({ userId: session.userId, workspaceId: workspace.id }),
    listWorkspaceDeliverables({ userId: session.userId, workspaceId: workspace.id }),
  ]);

  return (
    <div className="space-y-5">
      <WorkspaceTopBar
        iconLetter="我"
        title="个人工作区"
        subtitle="统一查看项目、协作、文件、快照和交付进度。"
        projectLabel={projects[0]?.title}
        stats={[
          { label: "项目", value: String(projects.length) },
          { label: "Agent", value: String(agentTasks.length) },
          { label: "快照", value: String(snapshots.length) },
          { label: "文件", value: String(artifactsState.items.length) },
        ]}
        actions={[
          { id: "import", label: "导入项目", icon: Upload, variant: "secondary" },
          { id: "new", label: "新建项目", icon: FilePlus2, href: "/p/new", variant: "primary" },
        ]}
      />

      <WorkViewTabs basePath="/work/personal" current={view} tabs={TABS} />

      {view === "overview" ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <SectionCard title="项目" description="你最近的项目，以及它们当前所在的工作区。">
          {projects.length === 0 ? (
            <EmptyState title="还没有项目" description="先创建或导入一个项目，开始你的个人工作区。" />
          ) : (
            <div className="space-y-3">
              {projects.slice(0, 5).map((project) => (
                <Link
                  key={project.id}
                  href={`/p/${encodeURIComponent(project.slug)}`}
                  className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-canvas)] px-3 py-3 hover:border-[var(--color-border-strong)]"
                >
                  <div className="min-w-0">
                  <div className="text-sm font-medium text-[var(--color-text-primary)] truncate">{project.title}</div>
                  <div className="text-xs text-[var(--color-text-secondary)] truncate">{project.workspaceTitle}</div>
                </div>
                <TagPill mono size="sm" accent={project.openSource ? "success" : "default"}>
                    {project.openSource ? "开源" : "私密"}
                  </TagPill>
                </Link>
              ))}
            </div>
          )}
          </SectionCard>

          <SectionCard title="协作" description="与你公开项目相关的近期协作意向。" icon={Inbox}>
            {intents.length === 0 ? (
              <EmptyState title="还没有发出的协作意向" description="你提交的协作请求会在这里出现。" />
            ) : (
              <div className="space-y-3">
                {intents.slice(0, 4).map((intent) => (
                  <div key={intent.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-canvas)] px-3 py-3">
                    <div className="text-sm font-medium text-[var(--color-text-primary)]">{intent.projectTitle}</div>
                    <div className="mt-1 text-xs text-[var(--color-text-secondary)] line-clamp-3">{intent.pitch || intent.message}</div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="智能代理工作" description="与你的智能代理绑定相关的最新审计与确认事项。" icon={Bot}>
            {agentTasks.length === 0 ? (
              <EmptyState title="还没有 Agent 工作记录" description="当 Agent 开始执行任务或发起确认时，这里会显示对应记录。" />
            ) : (
              <div className="space-y-3">
                {agentTasks.slice(0, 4).map((task) => (
                  <div key={task.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-canvas)] px-3 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium text-[var(--color-text-primary)]">{task.title}</div>
                      <TagPill mono size="sm" accent={task.status === "done" ? "success" : task.status === "failed" ? "error" : "warning"}>
                        {task.status === "done" ? "已完成" : task.status === "failed" ? "失败" : task.status === "pending_confirm" ? "待确认" : "运行中"}
                      </TagPill>
                    </div>
                    <div className="mt-1 text-xs text-[var(--color-text-secondary)]">{task.subtitle}</div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      ) : null}

      {view === "files" ? (
        <WorkspaceArtifactsPanel
          workspaceId={workspace.id}
          workspaceLabel="个人工作区"
          artifacts={artifactsState.items}
          storage={artifactsState.storage}
          currentUserId={session.userId}
          canDeleteAll
          emptyTitle="还没有个人文件"
          emptyDescription="上传第一个个人文件，把本地机器外的稳定资产轨迹沉淀到工作区。"
        />
      ) : null}

      {view === "snapshots" ? (
        <WorkspaceSnapshotsPanel
          workspaceId={workspace.id}
          workspaceLabel="个人工作区"
          projects={workspaceProjects}
          snapshots={snapshots}
          canRollback
          emptyTitle="还没有个人快照"
          emptyDescription="当你需要可靠的个人交接点或回滚检查点时，创建一个快照。"
        />
      ) : null}

      {view === "deliverables" ? (
        <WorkspaceDeliverablesPanel
          workspaceId={workspace.id}
          workspaceLabel="个人工作区"
          snapshots={snapshots}
          deliverables={deliverables.items}
          currentUserId={session.userId}
          canReview
          emptyTitle="还没有个人交付包"
          emptyDescription="当你需要正式交接或评审节点时，把快照整理成可评审的交付包。"
        />
      ) : null}

      {view === "signals" ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SectionCard title="通知" description="所有未读与最近系统信号都会回流到你的工作台。" icon={Bell}>
            {notifications.length === 0 ? (
              <EmptyState title="还没有通知" description="当协作者或 Agent 需要你处理时，相应提醒会出现在这里。" />
            ) : (
              <div className="space-y-3">
                {notifications.slice(0, 5).map((item) => (
                  <div key={item.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-canvas)] px-3 py-3">
                    <div className="text-sm font-medium text-[var(--color-text-primary)]">{item.title}</div>
                    <div className="mt-1 text-xs text-[var(--color-text-secondary)]">{item.body}</div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
          <SectionCard title="协作与 Agent" description="来自协作请求和 Agent 执行的最新信号。">
            <div className="space-y-3">
              {intents.slice(0, 2).map((intent) => (
                <div key={intent.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-canvas)] px-3 py-3">
                  <div className="text-sm font-medium text-[var(--color-text-primary)]">{intent.projectTitle}</div>
                  <div className="mt-1 text-xs text-[var(--color-text-secondary)] line-clamp-2">{intent.pitch || intent.message}</div>
                </div>
              ))}
              {agentTasks.slice(0, 2).map((task) => (
                <div key={task.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-canvas)] px-3 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium text-[var(--color-text-primary)]">{task.title}</div>
                    <TagPill mono size="sm" accent={task.status === "done" ? "success" : task.status === "failed" ? "error" : "warning"}>
                      {task.status === "done" ? "已完成" : task.status === "failed" ? "失败" : task.status === "pending_confirm" ? "待确认" : "运行中"}
                    </TagPill>
                  </div>
                </div>
              ))}
              {intents.length === 0 && agentTasks.length === 0 ? (
                <EmptyState title="还没有新的工作区信号" description="当协作请求或 Agent 动作出现时，会在这里集中展示。" />
              ) : null}
            </div>
          </SectionCard>
        </div>
      ) : null}
    </div>
  );
}
