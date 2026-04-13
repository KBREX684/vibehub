import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { TeamDetailActions } from "@/components/team-detail-actions";
import { TeamMilestonesPanel } from "@/components/team-milestones-panel";
import { TeamTasksPanel } from "@/components/team-tasks-panel";
import { getSessionUserFromCookie } from "@/lib/auth";
import { getTeamBySlug, listTeamMilestones, listTeamActivityLog } from "@/lib/repository";
import { Users, FolderGit2, ArrowLeft, Shield, User, Activity, CheckCircle, Target, UserPlus } from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function TeamDetailPage({ params }: Props) {
  const { slug } = await params;
  const session = await getSessionUserFromCookie();
  const team = await getTeamBySlug(slug, session?.userId ?? null);
  if (!team) {
    notFound();
  }

  const viewerId = session?.userId ?? null;
  const isMember = viewerId != null && team.members.some((m) => m.userId === viewerId);
  
  const [taskMilestones, activityLog] = await Promise.all([
    isMember ? listTeamMilestones({ teamSlug: slug, viewerUserId: viewerId }) : Promise.resolve([]),
    isMember ? listTeamActivityLog({ teamSlug: slug, page: 1, limit: 15 }) : Promise.resolve({ items: [], pagination: { total: 0 } })
  ]);

  const getActivityIcon = (entityType: string) => {
    switch (entityType) {
      case "team_task": return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case "team_milestone": return <Target className="w-4 h-4 text-blue-500" />;
      case "team_join_request": return <UserPlus className="w-4 h-4 text-purple-500" />;
      default: return <Activity className="w-4 h-4 text-amber-500" />;
    }
  };

  const getActivityColor = (entityType: string) => {
    switch (entityType) {
      case "team_task": return "bg-emerald-50 border-emerald-100";
      case "team_milestone": return "bg-blue-50 border-blue-100";
      case "team_join_request": return "bg-purple-50 border-purple-100";
      default: return "bg-amber-50 border-amber-100";
    }
  };

  return (
    <>
      <SiteHeader />
      <main className="container max-w-6xl py-12">
        <Link 
          href="/teams" 
          className="inline-flex items-center gap-2 text-stone-500 hover:text-amber-600 font-medium mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回团队列表
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Team Header */}
          <article className="lg:col-span-3 bg-white border border-stone-200 rounded-3xl p-8 md:p-12 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 opacity-60 pointer-events-none"></div>
            
            <div className="relative z-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                <div>
                  <h1 className="text-3xl md:text-4xl font-extrabold text-stone-900 mb-2 tracking-tight">
                    {team.name}
                  </h1>
                  <p className="text-sm font-mono text-stone-400 bg-stone-50 inline-block px-3 py-1 rounded-lg border border-stone-100">
                    /{team.slug}
                  </p>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center bg-stone-50 px-4 py-2 rounded-xl border border-stone-100">
                    <span className="text-2xl font-extrabold text-stone-900">{team.memberCount}</span>
                    <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">成员</span>
                  </div>
                  <div className="flex flex-col items-center bg-stone-50 px-4 py-2 rounded-xl border border-stone-100">
                    <span className="text-2xl font-extrabold text-stone-900">{team.projectCount}</span>
                    <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">项目</span>
                  </div>
                </div>
              </div>

              {team.mission && (
                <div className="bg-stone-50 rounded-2xl p-6 border border-stone-100">
                  <p className="text-stone-700 leading-relaxed text-lg font-medium">
                    &quot;{team.mission}&quot;
                  </p>
                </div>
              )}
            </div>
          </article>

          {/* Left Column: Members & Projects */}
          <div className="lg:col-span-1 space-y-8">
            <section className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <Users className="w-5 h-5 text-stone-400" />
                <h2 className="text-xl font-bold text-stone-900">团队成员</h2>
              </div>
              <ul className="space-y-4">
                {team.members.map((m) => (
                  <li key={m.userId} className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${m.role === 'owner' ? 'bg-amber-100' : 'bg-stone-100'}`}>
                      {m.role === 'owner' ? <Shield className="w-5 h-5 text-amber-600" /> : <User className="w-5 h-5 text-stone-500" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <strong className="text-stone-900 font-bold truncate">{m.name}</strong>
                        {m.role === 'owner' && <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-600 rounded-md uppercase tracking-wider">队长</span>}
                      </div>
                      <div className="text-xs text-stone-500 truncate">{m.email}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <FolderGit2 className="w-5 h-5 text-stone-400" />
                <h2 className="text-xl font-bold text-stone-900">团队项目</h2>
              </div>
              {team.teamProjects && team.teamProjects.length > 0 ? (
                <ul className="space-y-4">
                  {team.teamProjects.map((p) => (
                    <li key={p.slug} className="group">
                      <Link href={`/projects/${p.slug}`} className="block">
                        <strong className="text-stone-900 font-bold group-hover:text-amber-600 transition-colors block truncate mb-1">
                          {p.title}
                        </strong>
                        <div className="text-sm text-stone-500 line-clamp-2 leading-relaxed">
                          {p.oneLiner}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-8 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                  <p className="text-sm text-stone-500">暂无关联项目</p>
                </div>
              )}
            </section>

            {/* P3: Team Activity Log (Members Only) */}
            {isMember && (
              <section className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-stone-400" />
                    <h2 className="text-xl font-bold text-stone-900">协作日志</h2>
                  </div>
                </div>
                
                {activityLog.items.length === 0 ? (
                  <div className="text-center py-8 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                    <p className="text-sm text-stone-500">暂无活动记录</p>
                  </div>
                ) : (
                  <div className="relative pl-4 border-l-2 border-stone-100 space-y-6">
                    {activityLog.items.map((log) => (
                      <div key={log.id} className="relative">
                        <div className={`absolute -left-[25px] top-1 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center ${getActivityColor(log.entityType)}`}>
                          {getActivityIcon(log.entityType)}
                        </div>
                        <div>
                          <p className="text-sm text-stone-700 leading-snug mb-1">
                            <strong className="text-stone-900">{log.actorName || log.actorId}</strong> 
                            <span className="mx-1 text-stone-500">{log.action.replace(/_/g, ' ')}</span>
                          </p>
                          <time className="text-xs text-stone-400 font-medium">
                            {new Date(log.createdAt).toLocaleString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </time>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>

          {/* Right Column: Kanban & Milestones */}
          <div className="lg:col-span-2 space-y-8">
            {isMember ? (
              <>
                <div className="bg-white border border-stone-200 rounded-3xl p-8 shadow-sm">
                  <TeamTasksPanel
                    teamSlug={team.slug}
                    members={team.members}
                    milestones={taskMilestones}
                    currentUserId={session?.userId ?? null}
                  />
                </div>
                <div className="bg-white border border-stone-200 rounded-3xl p-8 shadow-sm">
                  <TeamMilestonesPanel teamSlug={team.slug} currentUserId={session?.userId ?? null} />
                </div>
              </>
            ) : (
              <div className="bg-white border border-stone-200 rounded-3xl p-12 shadow-sm text-center">
                <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-stone-400" />
                </div>
                <h3 className="text-xl font-bold text-stone-900 mb-2">内部协作空间</h3>
                <p className="text-stone-500 mb-8 max-w-md mx-auto">
                  任务看板、里程碑与协作日志仅团队成员可见。如果您想参与该团队的建设，请提交加入申请。
                </p>
                <TeamDetailActions team={team} currentUserId={session?.userId ?? null} />
              </div>
            )}
            
            {isMember && (
              <div className="bg-white border border-stone-200 rounded-3xl p-8 shadow-sm">
                <TeamDetailActions team={team} currentUserId={session?.userId ?? null} />
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
