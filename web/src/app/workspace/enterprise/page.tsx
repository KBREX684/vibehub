import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { getSessionUserFromCookie } from "@/lib/auth";
import { getEnterpriseWorkspaceSummary, getProjectRadar, getTalentRadarLegacy as getTalentRadar } from "@/lib/repository";
import { LayoutGrid, Users, Activity, Target, Zap, Shield, UserPlus, FolderGit2, Key, CheckCircle, User } from "lucide-react";

export default async function EnterpriseWorkspacePage() {
  const session = await getSessionUserFromCookie();
  
  if (!session) {
    return (
      <>
        <SiteHeader />
        <main className="container pb-24">
          <section className="py-20 md:py-32 flex flex-col items-center text-center relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-blue-50/80 rounded-full blur-[80px] -z-10 pointer-events-none"></div>
            
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-stone-200 text-sm font-medium text-stone-600 mb-8 shadow-sm">
              <Shield className="w-4 h-4 text-blue-500" />
              <span>VibeHub Enterprise</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-extrabold text-stone-900 tracking-tight mb-6 max-w-3xl leading-[1.1]">
              企业级 <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">协作与洞察</span> 工作台
            </h1>
            
            <p className="text-xl text-stone-500 max-w-2xl leading-relaxed mb-10">
              聚合团队管理、协作意向漏斗、项目雷达与人才发现。请登录后访问您的专属工作台。
            </p>

            <a 
              href="/api/v1/auth/demo-login?role=user&redirect=/workspace/enterprise" 
              className="inline-flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white px-8 py-4 rounded-2xl font-semibold transition-all hover:shadow-lg hover:-translate-y-0.5"
            >
              Demo 登录
            </a>
          </section>
        </main>
      </>
    );
  }

  const [
    { pendingJoinRequests, funnel, teams },
    projectRadar,
    talentRadar
  ] = await Promise.all([
    getEnterpriseWorkspaceSummary({ viewerUserId: session.userId }),
    getProjectRadar(5),
    getTalentRadar(5)
  ]);

  return (
    <>
      <SiteHeader />
      <main className="container max-w-7xl py-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <LayoutGrid className="w-5 h-5 text-blue-600" />
              </div>
              <h1 className="text-3xl font-bold text-stone-900 tracking-tight">企业工作台</h1>
            </div>
            <p className="text-stone-500 font-medium ml-14">
              欢迎回来，{session.name}。这是您的专属协作与洞察面板。
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link 
              href="/settings/api-keys" 
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 text-stone-600 rounded-xl text-sm font-semibold hover:bg-stone-50 transition-colors shadow-sm"
            >
              <Key className="w-4 h-4" /> API Keys
            </Link>
            <a 
              href="/api/v1/mcp/v2/manifest" 
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-xl text-sm font-semibold hover:bg-stone-800 transition-colors shadow-sm"
            >
              <Zap className="w-4 h-4" /> MCP v2
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Management & Funnel */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Funnel Metrics */}
            <section className="bg-white border border-stone-200 rounded-3xl p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <Activity className="w-6 h-6 text-emerald-500" />
                <h2 className="text-xl font-bold text-stone-900">协作意向漏斗</h2>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-stone-50 rounded-2xl p-5 border border-stone-100">
                  <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block mb-1">总提交</span>
                  <strong className="text-3xl font-extrabold text-stone-900">{funnel.totalSubmissions}</strong>
                </div>
                <div className="bg-stone-50 rounded-2xl p-5 border border-stone-100">
                  <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block mb-1">待审</span>
                  <strong className="text-3xl font-extrabold text-amber-600">{funnel.pending}</strong>
                </div>
                <div className="bg-stone-50 rounded-2xl p-5 border border-stone-100">
                  <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block mb-1">已通过 / 拒绝</span>
                  <div className="flex items-baseline gap-2">
                    <strong className="text-3xl font-extrabold text-emerald-600">{funnel.approved}</strong>
                    <span className="text-stone-400 font-medium">/ {funnel.rejected}</span>
                  </div>
                </div>
                <div className="bg-stone-50 rounded-2xl p-5 border border-stone-100">
                  <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block mb-1">通过率</span>
                  <strong className="text-3xl font-extrabold text-blue-600">{(funnel.approvalRate * 100).toFixed(1)}%</strong>
                </div>
              </div>
            </section>

            {/* Pending Join Requests */}
            <section className="bg-white border border-stone-200 rounded-3xl p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <UserPlus className="w-6 h-6 text-amber-500" />
                  <h2 className="text-xl font-bold text-stone-900">待审批入队申请</h2>
                </div>
                <span className="text-xs font-bold bg-amber-100 text-amber-700 px-3 py-1 rounded-full">
                  需您处理
                </span>
              </div>

              {pendingJoinRequests.length === 0 ? (
                <div className="text-center py-10 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                  <CheckCircle className="w-8 h-8 text-stone-300 mx-auto mb-3" />
                  <p className="text-stone-500 font-medium">暂无待处理的入队申请</p>
                </div>
              ) : (
                <ul className="space-y-4">
                  {pendingJoinRequests.map((r) => (
                    <li key={r.id} className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <strong className="text-lg font-bold text-stone-900">{r.applicantName}</strong>
                            <span className="text-xs text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">{r.applicantEmail}</span>
                          </div>
                          <div className="text-sm text-stone-600 mb-3">
                            申请加入团队：
                            <Link href={`/teams/${encodeURIComponent(r.teamSlug)}`} className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                              {r.teamName}
                            </Link>
                          </div>
                          {r.message && (
                            <div className="bg-stone-50 p-3 rounded-xl text-sm text-stone-700 border border-stone-100 italic">
                              &quot;{r.message}&quot;
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Link 
                            href={`/teams/${encodeURIComponent(r.teamSlug)}`}
                            className="inline-flex items-center justify-center px-4 py-2 bg-stone-900 text-white text-sm font-semibold rounded-xl hover:bg-stone-800 transition-colors"
                          >
                            去处理
                          </Link>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* My Teams */}
            <section className="bg-white border border-stone-200 rounded-3xl p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <Users className="w-6 h-6 text-blue-500" />
                <h2 className="text-xl font-bold text-stone-900">我的团队</h2>
              </div>

              {teams.length === 0 ? (
                <div className="text-center py-10 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                  <p className="text-stone-500 font-medium mb-4">您尚未加入任何团队</p>
                  <Link href="/teams" className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-stone-200 text-stone-700 font-semibold rounded-xl hover:bg-stone-50 transition-colors shadow-sm">
                    浏览团队大厅
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {teams.map((t) => (
                    <Link 
                      key={t.id} 
                      href={`/teams/${encodeURIComponent(t.slug)}`}
                      className="group bg-white border border-stone-200 rounded-2xl p-5 hover:border-blue-300 hover:shadow-md transition-all"
                    >
                      <h3 className="text-lg font-bold text-stone-900 group-hover:text-blue-600 transition-colors mb-4 truncate">
                        {t.name}
                      </h3>
                      <div className="flex items-center gap-4 text-sm font-medium text-stone-500">
                        <div className="flex items-center gap-1.5 bg-stone-50 px-2.5 py-1 rounded-lg">
                          <Users className="w-4 h-4" /> {t.memberCount}
                        </div>
                        <div className="flex items-center gap-1.5 bg-stone-50 px-2.5 py-1 rounded-lg">
                          <FolderGit2 className="w-4 h-4" /> {t.projectCount}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Right Column: Radars */}
          <div className="lg:col-span-1 space-y-8">
            
            {/* Project Radar */}
            <section className="bg-gradient-to-b from-stone-900 to-stone-800 rounded-3xl p-8 shadow-lg text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
              
              <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-400" />
                  <h2 className="text-lg font-bold">项目雷达</h2>
                </div>
                <span className="text-xs font-bold bg-white/10 text-stone-300 px-2 py-1 rounded-md uppercase tracking-wider">
                  Top 5
                </span>
              </div>

              <ul className="space-y-4 relative z-10">
                {projectRadar.map((p) => (
                  <li key={p.slug} className="group">
                    <Link href={`/projects/${p.slug}`} className="block bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-4 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <strong className="font-bold text-blue-300 group-hover:text-blue-200 truncate pr-4">
                          {p.title}
                        </strong>
                        <span className="text-xs font-mono bg-black/30 px-2 py-1 rounded-md text-stone-400 shrink-0">
                          {p.score} pts
                        </span>
                      </div>
                      <div className="text-xs text-stone-400 line-clamp-1 mb-3">
                        {p.oneLiner}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {p.techStack.slice(0, 3).map(tech => (
                          <span key={tech} className="text-[10px] font-medium px-2 py-0.5 bg-white/10 text-stone-300 rounded">
                            {tech}
                          </span>
                        ))}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            {/* Talent Radar */}
            <section className="bg-gradient-to-b from-amber-50 to-orange-50 border border-amber-200/50 rounded-3xl p-8 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
              
              <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-amber-600" />
                  <h2 className="text-lg font-bold text-stone-900">人才雷达</h2>
                </div>
                <span className="text-xs font-bold bg-amber-200/50 text-amber-800 px-2 py-1 rounded-md uppercase tracking-wider">
                  Top 5
                </span>
              </div>

              <ul className="space-y-3 relative z-10">
                {talentRadar.map((t) => (
                  <li key={t.creatorSlug}>
                    <Link href={`/creators/${t.creatorSlug}`} className="block bg-white/80 hover:bg-white border border-white/50 hover:border-amber-200 rounded-2xl p-4 transition-all shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <strong className="font-bold text-stone-900 truncate pr-2">
                          {t.creatorSlug}
                        </strong>
                        <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded-md shrink-0">
                          {t.contributionScore} 积分
                        </span>
                      </div>
                      <div className="text-xs text-stone-500 truncate mb-2">
                        {t.headline}
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-stone-100/50">
                        <span className="text-[10px] font-semibold text-stone-400 uppercase">
                          {t.collaborationPreference === 'open' ? '开放协作' : t.collaborationPreference === 'invite_only' ? '仅限邀请' : '暂不协作'}
                        </span>
                        <span className="text-xs font-medium text-stone-500 flex items-center gap-1">
                          <FolderGit2 className="w-3 h-3" /> {t.projectCount}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

          </div>
        </div>
      </main>
    </>
  );
}

