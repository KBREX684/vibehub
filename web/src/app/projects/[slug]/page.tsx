import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { CollaborationIntentForm } from "@/components/collaboration-intent-form";
import { ProjectTeamLinkForm } from "@/components/project-team-link-form";
import { getSessionUserFromCookie } from "@/lib/auth";
import { getCreatorProfileById, getProjectBySlug, listProjectCollaborationIntents } from "@/lib/repository";
import { ExternalLink, Users, Tag, Calendar, Terminal } from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ProjectDetailPage({ params }: Props) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  const mcpToolExample = {
    tool: "get_project_detail",
    input: { slug: project.slug },
  };

  const approvedIntents = await listProjectCollaborationIntents({
    projectId: project.id,
    status: "approved",
    page: 1,
    limit: 8,
  });

  const session = await getSessionUserFromCookie();
  const creatorProfile = await getCreatorProfileById(project.creatorId);
  const canLinkTeam = Boolean(session && creatorProfile && session.userId === creatorProfile.userId);

  const statusColors: Record<string, string> = {
    idea: "bg-stone-100 text-stone-600 border-stone-200",
    building: "bg-blue-50 text-blue-600 border-blue-200",
    launched: "bg-emerald-50 text-emerald-600 border-emerald-200",
    paused: "bg-red-50 text-red-600 border-red-200",
  };
  const statusColor = statusColors[project.status] || "bg-stone-100 text-stone-600 border-stone-200";

  return (
    <>
      <SiteHeader />
      <main className="container max-w-5xl py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            <article className="bg-white border border-stone-200 rounded-3xl p-8 md:p-10 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 opacity-60 pointer-events-none"></div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border ${statusColor}`}>
                    {project.status}
                  </span>
                  <span className="flex items-center gap-1.5 text-sm text-stone-400 font-medium">
                    <Calendar className="w-4 h-4" />
                    {new Date(project.updatedAt).toLocaleDateString("zh-CN")}
                  </span>
                </div>

                <h1 className="text-3xl md:text-5xl font-extrabold text-stone-900 mb-4 leading-tight tracking-tight">
                  {project.title}
                </h1>
                
                <p className="text-xl text-stone-500 font-medium mb-8 leading-relaxed">
                  {project.oneLiner}
                </p>

                <div className="prose prose-stone max-w-none text-stone-700 leading-relaxed text-lg mb-8">
                  {project.description.split('\n').map((paragraph, i) => (
                    <p key={i} className="mb-4">{paragraph}</p>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-6 pt-6 border-t border-stone-100">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-amber-600" />
                    <div className="flex flex-wrap gap-2">
                      {project.techStack.map((tech) => (
                        <span key={`${project.id}-${tech}`} className="text-xs font-medium px-2.5 py-1 bg-stone-100 text-stone-700 rounded-md">
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {project.demoUrl && (
                    <a 
                      href={project.demoUrl} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600 hover:text-amber-700 transition-colors ml-auto"
                    >
                      <ExternalLink className="w-4 h-4" />
                      访问演示
                    </a>
                  )}
                </div>
              </div>
            </article>

            {canLinkTeam && (
              <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
                <ProjectTeamLinkForm project={project} canEdit={canLinkTeam} />
              </div>
            )}

            <section className="bg-white border border-stone-200 rounded-3xl p-8 md:p-10 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <Users className="w-6 h-6 text-amber-600" />
                <h3 className="text-2xl font-bold text-stone-900">协作广场</h3>
              </div>
              <p className="text-stone-500 mb-8 text-lg">
                提交您的协作意向。选择加入团队或招募成员，并提供相关背景信息。
              </p>
              <div className="bg-stone-50 rounded-2xl p-6 border border-stone-100">
                <CollaborationIntentForm projectSlug={project.slug} />
              </div>
            </section>

            <section className="bg-white border border-stone-200 rounded-3xl p-8 md:p-10 shadow-sm">
              <h3 className="text-2xl font-bold text-stone-900 mb-2">已通过的协作意向</h3>
              <p className="text-stone-500 mb-8">共 {approvedIntents.items.length} 条通过的申请记录。</p>
              
              {approvedIntents.items.length === 0 ? (
                <div className="bg-stone-50 border border-dashed border-stone-200 rounded-2xl p-12 text-center">
                  <p className="text-stone-500">暂无已通过的协作意向。</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {approvedIntents.items.map((intent) => (
                    <article key={intent.id} className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <strong className="text-sm font-bold text-stone-900 uppercase tracking-wider bg-stone-100 px-3 py-1 rounded-lg">
                          {intent.intentType === "join" ? "加入请求" : "招募公告"}
                        </strong>
                        <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                          {intent.status}
                        </span>
                      </div>
                      <p className="text-stone-700 leading-relaxed mb-4">{intent.message}</p>
                      <div className="flex flex-wrap gap-4 text-sm text-stone-500 border-t border-stone-100 pt-4">
                        <span>申请人: <strong className="text-stone-700">{intent.applicantId}</strong></span>
                        {intent.contact && <span>联系方式: <strong className="text-stone-700">{intent.contact}</strong></span>}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            <div className="bg-stone-900 text-stone-100 border border-stone-800 rounded-3xl p-8 shadow-lg">
              <div className="flex items-center gap-2 mb-6 text-amber-500">
                <Terminal className="w-5 h-5" />
                <h3 className="text-lg font-bold tracking-wide">Agent API</h3>
              </div>
              <p className="text-stone-400 text-sm mb-4 leading-relaxed">
                可供 AI Agent 调用的结构化数据接口：
              </p>
              <pre className="bg-black text-stone-300 p-4 rounded-xl overflow-x-auto text-xs font-mono border border-stone-800 mb-6">
                {JSON.stringify(mcpToolExample, null, 2)}
              </pre>
              <div className="text-xs text-stone-500 bg-stone-800/50 p-3 rounded-lg break-all">
                <span className="text-stone-400 font-semibold mb-1 block">Endpoint:</span>
                <code>/api/v1/mcp/get_project_detail?slug={project.slug}</code>
              </div>
            </div>

            <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm text-center">
              <Link 
                href="/discover" 
                className="inline-flex items-center justify-center w-full bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold py-3 px-4 rounded-xl transition-colors"
              >
                返回项目发现
              </Link>
            </div>
          </aside>

        </div>
      </main>
    </>
  );
}
