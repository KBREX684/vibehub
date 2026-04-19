import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Bot, FolderKanban, Settings2, Users } from "lucide-react";
import { getSessionUserFromCookie } from "@/lib/auth";
import { getTeamBySlug, listTeamMilestones } from "@/lib/repository";
import {
  ensureTeamWorkspace,
  listWorkspaceArtifacts,
  listWorkspaceDeliverables,
  listWorkspaceProjects,
  listWorkspaceSnapshots,
} from "@/lib/repositories/workspace.repository";
import { TeamActivityTimeline } from "@/components/team-activity-timeline";
import { TeamDiscussionsPanel } from "@/components/team-discussions-panel";
import { TeamMilestonesPanel } from "@/components/team-milestones-panel";
import { TeamTasksPanel } from "@/components/team-tasks-panel";
import { WorkspaceArtifactsPanel } from "@/components/workspace-artifacts-panel";
import { WorkspaceDeliverablesPanel } from "@/components/workspace-deliverables-panel";
import { WorkspaceSnapshotsPanel } from "@/components/workspace-snapshots-panel";
import { Avatar, PageHeader, SectionCard, TagPill } from "@/components/ui";
import { WorkViewTabs } from "@/components/work-view-tabs";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ view?: string }>;
}

const TABS = [
  { label: "动态", value: "activity" },
  { label: "文件", value: "files" },
  { label: "快照", value: "snapshots" },
  { label: "交付包", value: "deliverables" },
  { label: "任务", value: "tasks" },
  { label: "里程碑", value: "milestones" },
  { label: "成员", value: "members" },
  { label: "讨论", value: "discussions" },
  { label: "智能代理", value: "agent" },
  { label: "设置", value: "settings" },
];

export default async function WorkTeamPage({ params, searchParams }: Props) {
  const session = await getSessionUserFromCookie();
  const { slug } = await params;
  const sp = (await searchParams) ?? {};
  const view = sp.view ?? "activity";

  if (!session) {
    redirect(`/login?redirect=/work/team/${encodeURIComponent(slug)}`);
  }

  const team = await getTeamBySlug(slug, session.userId);
  if (!team) notFound();

  const workspace = await ensureTeamWorkspace(team.id);
  const [milestones, fileState, snapshotProjects, snapshots, deliverables] = await Promise.all([
    listTeamMilestones({ teamSlug: slug, viewerUserId: session.userId }),
    view === "files" ? listWorkspaceArtifacts({ userId: session.userId, workspaceId: workspace.id }) : Promise.resolve(null),
    view === "snapshots" || view === "deliverables"
      ? listWorkspaceProjects({ userId: session.userId, workspaceId: workspace.id })
      : Promise.resolve([]),
    view === "snapshots" || view === "deliverables"
      ? listWorkspaceSnapshots({ userId: session.userId, workspaceId: workspace.id })
      : Promise.resolve([]),
    view === "deliverables"
      ? listWorkspaceDeliverables({ userId: session.userId, workspaceId: workspace.id })
      : Promise.resolve({ items: [] }),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        icon={FolderKanban}
        eyebrow="团队工作区"
        title={team.name}
        subtitle={team.mission ?? "面向结构化协作、Agent 受控执行与交付闭环的团队共享工作区。"}
        actions={
          <>
            <Link href={`/work/team/${encodeURIComponent(team.slug)}?view=agent`} className="btn btn-secondary text-sm px-4 py-2 inline-flex items-center gap-1.5">
              <Bot className="w-4 h-4" />
              智能代理面板
            </Link>
            <Link href={`/work/team/${encodeURIComponent(team.slug)}?view=settings`} className="btn btn-ghost text-sm px-4 py-2 inline-flex items-center gap-1.5">
              <Settings2 className="w-4 h-4" />
              团队设置
            </Link>
          </>
        }
      />

      <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-4 py-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-secondary)]">
          <TagPill mono size="sm" accent="default">团队工作区</TagPill>
          <TagPill mono size="sm" accent="default">{team.memberCount} 名成员</TagPill>
          <TagPill mono size="sm" accent="default">{team.projectCount} 个项目</TagPill>
        </div>
      </div>

      <WorkViewTabs basePath={`/work/team/${encodeURIComponent(team.slug)}`} current={view} tabs={TABS} />

      {view === "activity" ? <TeamActivityTimeline teamSlug={team.slug} currentUserId={session.userId} fullWidth /> : null}
      {view === "files" && fileState ? (
        <WorkspaceArtifactsPanel
          workspaceId={workspace.id}
          workspaceLabel={team.name}
          artifacts={fileState.items}
          storage={fileState.storage}
          currentUserId={session.userId}
          canDeleteAll={team.viewerRole === "owner" || team.viewerRole === "admin"}
          emptyTitle="团队还没有文件"
          emptyDescription="上传第一个团队文件，开始建立这个工作区的共享资产轨迹。"
        />
      ) : null}
      {view === "snapshots" ? (
        <WorkspaceSnapshotsPanel
          workspaceId={workspace.id}
          workspaceLabel={team.name}
          projects={snapshotProjects}
          snapshots={snapshots}
          canRollback={team.viewerRole === "owner" || team.viewerRole === "admin"}
          emptyTitle="团队还没有快照"
          emptyDescription="创建第一个团队快照，为这个工作区沉淀一个可交接的检查点。"
        />
      ) : null}
      {view === "deliverables" ? (
        <WorkspaceDeliverablesPanel
          workspaceId={workspace.id}
          workspaceLabel={team.name}
          snapshots={snapshots}
          deliverables={deliverables.items}
          currentUserId={session.userId}
          canReview={team.viewerRole === "owner" || team.viewerRole === "admin"}
          emptyTitle="团队还没有交付包"
          emptyDescription="当需要评审或交付时，从团队快照创建交付包。"
        />
      ) : null}
      {view === "tasks" ? (
        <TeamTasksPanel
          teamSlug={team.slug}
          members={team.members}
          milestones={milestones}
          currentUserId={session.userId}
          viewerRole={team.viewerRole}
        />
      ) : null}
      {view === "milestones" ? <TeamMilestonesPanel teamSlug={team.slug} currentUserId={session.userId} /> : null}
      {view === "discussions" ? <TeamDiscussionsPanel teamSlug={team.slug} currentUserId={session.userId} /> : null}
      {view === "members" ? (
        <SectionCard title="成员" description="所有 Agent 与交付决策最终仍由真实团队成员负责。" icon={Users}>
          <div className="space-y-3">
            {team.members.map((member) => (
              <div key={member.userId} className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-canvas)] px-3 py-3">
                <Avatar tone="neutral" size="md" initial={member.name.charAt(0)} alt={member.name} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-[var(--color-text-primary)]">{member.name}</div>
                  <div className="text-xs text-[var(--color-text-secondary)] truncate">{member.email}</div>
                </div>
                <TagPill mono size="sm" accent={member.role === "owner" ? "success" : "default"}>
                  {member.role === "owner" ? "所有者" : member.role === "admin" ? "管理员" : "成员"}
                </TagPill>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}
      {view === "agent" ? (
          <SectionCard title="智能代理控制面" description="团队工作区中的智能代理、任务与确认流已经统一进入 v10 主面。">
            <div className="flex flex-wrap gap-3">
            <Link href={`/work/team/${encodeURIComponent(team.slug)}?view=agent`} className="btn btn-primary text-sm px-4 py-2 inline-flex items-center gap-1.5">
              <Bot className="w-4 h-4" />
              打开团队智能代理
            </Link>
            <Link href="/work/agent-tasks" className="btn btn-secondary text-sm px-4 py-2">
              打开智能代理任务中心
            </Link>
          </div>
        </SectionCard>
      ) : null}
      {view === "settings" ? (
        <SectionCard title="团队设置" description="团队级设置已经收口到工作区主面与设置视图中。">
          <Link href={`/work/team/${encodeURIComponent(team.slug)}?view=settings`} className="btn btn-primary text-sm px-4 py-2 inline-flex items-center gap-1.5">
            <Settings2 className="w-4 h-4" />
            打开团队设置
          </Link>
        </SectionCard>
      ) : null}
    </div>
  );
}
