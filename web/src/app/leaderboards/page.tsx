import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import {
  getDiscussionLeaderboard,
  getProjectCollaborationLeaderboard,
  getWeeklyLeaderboardPublicPayload,
  parseUtcWeekStartParam,
  startOfUtcWeekContaining,
  listContributionLeaderboard,
} from "@/lib/repository";
import { Trophy, Flame, Users, Calendar, ChevronLeft, ChevronRight, Medal, Star } from "lucide-react";

function formatWeekRangeLabel(weekStart: Date): string {
  const end = new Date(weekStart.getTime());
  end.setUTCDate(end.getUTCDate() + 6);
  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, "0")}.${String(d.getUTCDate()).padStart(2, "0")}`;
  return `${fmt(weekStart)} - ${fmt(end)}`;
}

function addDaysUtc(d: Date, days: number): Date {
  const next = new Date(d.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function toWeekQueryParam(weekStart: Date): string {
  return `${weekStart.getUTCFullYear()}-${String(weekStart.getUTCMonth() + 1).padStart(2, "0")}-${String(weekStart.getUTCDate()).padStart(2, "0")}`;
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LeaderboardsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const weekRaw = typeof sp.week === "string" ? sp.week : undefined;
  const weekStart =
    weekRaw && weekRaw.trim()
      ? parseUtcWeekStartParam(weekRaw)
      : startOfUtcWeekContaining(new Date());

  const effectiveWeek = weekStart ?? startOfUtcWeekContaining(new Date());
  const prevWeek = addDaysUtc(effectiveWeek, -7);
  const nextWeek = addDaysUtc(effectiveWeek, 7);
  const nowWeek = startOfUtcWeekContaining(new Date());
  const invalidWeek = weekRaw && weekRaw.trim() && !weekStart;

  const [discussions, projects, weeklyDiscussions, weeklyProjects, contributionLeaderboard] = await Promise.all([
    getDiscussionLeaderboard(10),
    getProjectCollaborationLeaderboard(10),
    getWeeklyLeaderboardPublicPayload({
      weekStart: effectiveWeek,
      kind: "discussions_by_weekly_comment_count",
      limit: 10,
    }),
    getWeeklyLeaderboardPublicPayload({
      weekStart: effectiveWeek,
      kind: "projects_by_weekly_collaboration_intent_count",
      limit: 10,
    }),
    listContributionLeaderboard(10),
  ]);

  return (
    <>
      <SiteHeader />
      <main className="container pb-24">
        <section className="py-16 md:py-24 flex flex-col items-center text-center relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-amber-50/80 rounded-full blur-[80px] -z-10 pointer-events-none"></div>
          
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-stone-200 text-sm font-medium text-stone-600 mb-8 shadow-sm">
            <Medal className="w-4 h-4 text-amber-500" />
            <span>VibeHub 社区榜单</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-extrabold text-stone-900 tracking-tight mb-6 max-w-3xl leading-[1.1]">
            发现社区中最具 <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600">影响力</span> 的内容
          </h1>
          
          <p className="text-xl text-stone-500 max-w-2xl leading-relaxed mb-8">
            追踪每周最热讨论与最受关注的协作项目，不错过任何重要趋势。
          </p>

          <div className="flex items-center gap-4 bg-white border border-stone-200 rounded-2xl p-2 shadow-sm">
            <Link 
              href={`/leaderboards?week=${toWeekQueryParam(prevWeek)}`} 
              className="p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            
            <div className="flex items-center gap-2 px-4 font-semibold text-stone-700">
              <Calendar className="w-4 h-4 text-amber-600" />
              {formatWeekRangeLabel(effectiveWeek)}
            </div>

            <Link 
              href={`/leaderboards?week=${toWeekQueryParam(nextWeek)}`} 
              className="p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </Link>

            {effectiveWeek.getTime() !== nowWeek.getTime() && (
              <Link 
                href="/leaderboards" 
                className="ml-2 px-4 py-2 text-sm font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors"
              >
                回到本周
              </Link>
            )}
          </div>
          
          {invalidWeek && (
            <p className="text-red-500 text-sm mt-4 font-medium">
              无效的日期参数，已为您展示当前周数据。
            </p>
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto mb-12">
          {/* Weekly Discussions */}
          <section className="bg-white border border-stone-200 rounded-3xl p-8 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4 opacity-60 pointer-events-none"></div>
            
            <div className="flex items-center justify-between mb-8 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center">
                  <Flame className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-stone-900">本周最热讨论</h2>
                  <p className="text-sm text-stone-500 font-medium">按周内新增评论数排序</p>
                </div>
              </div>
              <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 bg-stone-100 text-stone-500 rounded-lg">
                {weeklyDiscussions.source === "materialized" ? "已快照" : "实时"}
              </span>
            </div>

            <ol className="space-y-4 relative z-10">
              {weeklyDiscussions.rows.length === 0 ? (
                <div className="text-center py-12 text-stone-500">本周暂无数据</div>
              ) : (
                weeklyDiscussions.rows.map((row, i) => (
                  <li key={row.entityId} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-stone-50 transition-colors border border-transparent hover:border-stone-100">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${i < 3 ? 'bg-orange-100 text-orange-700' : 'bg-stone-100 text-stone-500'}`}>
                      {row.rank}
                    </div>
                    <div className="min-w-0 flex-grow">
                      <Link href={`/discussions/${row.slug}`} className="text-stone-900 font-bold hover:text-orange-600 transition-colors truncate block">
                        {row.title}
                      </Link>
                      <div className="text-sm text-stone-500 mt-1">{row.score} 条新增评论</div>
                    </div>
                  </li>
                ))
              )}
            </ol>
          </section>

          {/* Weekly Projects */}
          <section className="bg-white border border-stone-200 rounded-3xl p-8 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4 opacity-60 pointer-events-none"></div>
            
            <div className="flex items-center justify-between mb-8 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-stone-900">本周活跃项目</h2>
                  <p className="text-sm text-stone-500 font-medium">按周内新增协作意向排序</p>
                </div>
              </div>
              <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 bg-stone-100 text-stone-500 rounded-lg">
                {weeklyProjects.source === "materialized" ? "已快照" : "实时"}
              </span>
            </div>

            <ol className="space-y-4 relative z-10">
              {weeklyProjects.rows.length === 0 ? (
                <div className="text-center py-12 text-stone-500">本周暂无数据</div>
              ) : (
                weeklyProjects.rows.map((row, i) => (
                  <li key={row.entityId} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-stone-50 transition-colors border border-transparent hover:border-stone-100">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${i < 3 ? 'bg-blue-100 text-blue-700' : 'bg-stone-100 text-stone-500'}`}>
                      {row.rank}
                    </div>
                    <div className="min-w-0 flex-grow">
                      <Link href={`/projects/${row.slug}`} className="text-stone-900 font-bold hover:text-blue-600 transition-colors truncate block">
                        {row.title}
                      </Link>
                      <div className="text-sm text-stone-500 mt-1">{row.score} 条新增意向</div>
                    </div>
                  </li>
                ))
              )}
            </ol>
          </section>
        </div>

        {/* P3: Contribution Leaderboard */}
        <div className="max-w-6xl mx-auto mb-12">
          <section className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/50 rounded-3xl p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center shadow-inner">
                  <Star className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-stone-900">社区信誉总榜</h2>
                  <p className="text-sm text-stone-500 font-medium">按累计贡献积分 (Contribution Credit) 排序</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contributionLeaderboard.map((user, index) => (
                <div key={user.userId} className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl p-5 flex items-center gap-4 hover:bg-white transition-colors shadow-sm">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shrink-0 shadow-inner ${
                    index === 0 ? 'bg-yellow-100 text-yellow-700' : 
                    index === 1 ? 'bg-slate-200 text-slate-700' : 
                    index === 2 ? 'bg-amber-200 text-amber-800' : 
                    'bg-stone-100 text-stone-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-grow">
                    <div className="text-stone-900 font-bold truncate text-lg">
                      {user.userId}
                    </div>
                    <div className="text-sm font-semibold text-amber-600 mt-0.5">
                      {user.score} <span className="text-stone-400 font-medium text-xs ml-1">积分</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* All-time Discussions */}
          <section className="bg-stone-50 border border-stone-200 rounded-3xl p-8">
            <div className="flex items-center gap-3 mb-8">
              <Trophy className="w-6 h-6 text-stone-400" />
              <div>
                <h2 className="text-xl font-bold text-stone-900">历史讨论总榜</h2>
                <p className="text-sm text-stone-500 font-medium">按累计评论总数排序</p>
              </div>
            </div>

            <ol className="space-y-3">
              {discussions.map((row, index) => (
                <li key={row.postId} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white transition-colors">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 bg-stone-200 text-stone-600">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-grow flex items-center justify-between gap-4">
                    <Link href={`/discussions/${row.slug}`} className="text-stone-700 font-semibold hover:text-stone-900 transition-colors truncate">
                      {row.title}
                    </Link>
                    <span className="text-xs font-bold text-stone-400 shrink-0">{row.commentCount} 评</span>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* All-time Projects */}
          <section className="bg-stone-50 border border-stone-200 rounded-3xl p-8">
            <div className="flex items-center gap-3 mb-8">
              <Trophy className="w-6 h-6 text-stone-400" />
              <div>
                <h2 className="text-xl font-bold text-stone-900">历史项目总榜</h2>
                <p className="text-sm text-stone-500 font-medium">按累计协作意向总数排序</p>
              </div>
            </div>

            <ol className="space-y-3">
              {projects.map((row, index) => (
                <li key={row.projectId} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white transition-colors">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 bg-stone-200 text-stone-600">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-grow flex items-center justify-between gap-4">
                    <Link href={`/projects/${row.slug}`} className="text-stone-700 font-semibold hover:text-stone-900 transition-colors truncate">
                      {row.title}
                    </Link>
                    <span className="text-xs font-bold text-stone-400 shrink-0">{row.intentCount} 意向</span>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </main>
    </>
  );
}
