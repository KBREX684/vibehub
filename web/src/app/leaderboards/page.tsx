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
import { Trophy, Flame, Users, Calendar, ChevronLeft, ChevronRight, Medal, Star, Sparkles, MessageSquare } from "lucide-react";

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
      <main className="container pb-24 space-y-12 mt-6">
        
        {/* Cinematic Hero */}
        <section className="relative w-full rounded-[32px] bg-[rgba(255,255,255,0.85)] backdrop-blur-[24px] saturate-[150%] shadow-[0_8px_32px_-4px_rgba(0,0,0,0.04)] border border-white/60 overflow-hidden text-center py-20 md:py-28">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-[#f5ebd4]/60 rounded-full blur-[100px] -z-10 pointer-events-none" />
          
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-[980px] bg-white border border-black/5 text-sm font-medium text-[var(--color-text-secondary)] mb-8 shadow-sm">
            <Medal className="w-4 h-4 text-[#d97706]" />
            <span>VibeHub Leaderboards</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-semibold tracking-[-0.03em] leading-[1.07] text-[var(--color-text-primary)] mb-6 max-w-4xl mx-auto">
            Discover the most <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#d97706] to-[#f5ebd4]">influential</span> content
          </h1>
          
          <p className="text-lg md:text-xl text-[var(--color-text-secondary)] max-w-2xl mx-auto leading-[1.47] mb-12">
            Track weekly trending discussions and highly anticipated projects. Never miss a beat in the community.
          </p>

          <div className="inline-flex items-center gap-4 bg-white border border-black/5 rounded-[20px] p-2 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.04)]">
            <Link 
              href={`/leaderboards?week=${toWeekQueryParam(prevWeek)}`} 
              className="p-3 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-black/5 rounded-[12px] transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            
            <div className="flex items-center gap-2 px-4 font-semibold text-[var(--color-text-primary)] text-[0.95rem]">
              <Calendar className="w-4 h-4 text-[var(--color-accent-apple)]" />
              {formatWeekRangeLabel(effectiveWeek)}
            </div>

            <Link 
              href={`/leaderboards?week=${toWeekQueryParam(nextWeek)}`} 
              className="p-3 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-black/5 rounded-[12px] transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </Link>

            {effectiveWeek.getTime() !== nowWeek.getTime() && (
              <Link 
                href="/leaderboards" 
                className="ml-2 px-5 py-2.5 text-[0.85rem] font-semibold text-white bg-[var(--color-text-primary)] hover:bg-black rounded-[12px] transition-colors shadow-sm"
              >
                Current Week
              </Link>
            )}
          </div>
          
          {invalidWeek && (
            <p className="text-[#e11d48] text-[0.9rem] mt-6 font-medium bg-[#fee2e2] inline-block px-4 py-2 rounded-[12px]">
              Invalid date parameter. Showing current week data.
            </p>
          )}
        </section>

        {/* Weekly Leaderboards Bento */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Weekly Discussions */}
          <section className="p-8 md:p-10 rounded-[32px] bg-[rgba(255,255,255,0.85)] backdrop-blur-[24px] saturate-[150%] shadow-[0_8px_32px_-4px_rgba(0,0,0,0.04)] border border-white/60 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#f5ebd4] rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4 opacity-40 pointer-events-none" />
            
            <div className="flex items-center justify-between mb-10 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-[20px] bg-[#f5ebd4]/40 flex items-center justify-center shadow-sm">
                  <Flame className="w-7 h-7 text-[#d97706]" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)] m-0">Hot Discussions</h2>
                  <p className="text-[0.95rem] text-[var(--color-text-secondary)] m-0 mt-1">Ranked by new comments this week</p>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 bg-black/5 text-[var(--color-text-secondary)] rounded-[980px]">
                {weeklyDiscussions.source === "materialized" ? "Snapshot" : "Live"}
              </span>
            </div>

            <ol className="space-y-3 relative z-10">
              {weeklyDiscussions.rows.length === 0 ? (
                <div className="text-center py-16 text-[var(--color-text-tertiary)] bg-black/5 rounded-[24px] border border-black/5">No data for this week</div>
              ) : (
                weeklyDiscussions.rows.map((row, i) => (
                  <li key={row.entityId} className="group flex items-center gap-5 p-4 rounded-[20px] bg-white border border-black/5 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_32px_-4px_rgba(0,0,0,0.06)] hover:border-[#f5ebd4]/60 hover:-translate-y-0.5 transition-all duration-300">
                    <div className={`w-10 h-10 rounded-[14px] flex items-center justify-center font-mono font-bold text-[1.1rem] shrink-0 shadow-inner ${i === 0 ? 'bg-gradient-to-br from-[#f5ebd4] to-[#fcd34d] text-[#b45309]' : i === 1 ? 'bg-gradient-to-br from-slate-100 to-slate-300 text-slate-600' : i === 2 ? 'bg-gradient-to-br from-amber-100 to-amber-300 text-amber-800' : 'bg-black/5 text-[var(--color-text-secondary)]'}`}>
                      {row.rank}
                    </div>
                    <div className="min-w-0 flex-grow">
                      <Link href={`/discussions/${row.slug}`} className="text-[1.05rem] text-[var(--color-text-primary)] font-semibold hover:text-[#d97706] transition-colors truncate block leading-snug outline-none">
                        {row.title}
                      </Link>
                      <div className="text-[0.85rem] font-medium text-[var(--color-text-tertiary)] mt-1 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5" /> {row.score} new comments
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ol>
          </section>

          {/* Weekly Projects */}
          <section className="p-8 md:p-10 rounded-[32px] bg-[rgba(255,255,255,0.85)] backdrop-blur-[24px] saturate-[150%] shadow-[0_8px_32px_-4px_rgba(0,0,0,0.04)] border border-white/60 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#81e6d9] rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4 opacity-30 pointer-events-none" />
            
            <div className="flex items-center justify-between mb-10 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-[20px] bg-[#81e6d9]/20 flex items-center justify-center shadow-sm">
                  <Users className="w-7 h-7 text-[#0d9488]" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)] m-0">Active Projects</h2>
                  <p className="text-[0.95rem] text-[var(--color-text-secondary)] m-0 mt-1">Ranked by new collaboration intents</p>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 bg-black/5 text-[var(--color-text-secondary)] rounded-[980px]">
                {weeklyProjects.source === "materialized" ? "Snapshot" : "Live"}
              </span>
            </div>

            <ol className="space-y-3 relative z-10">
              {weeklyProjects.rows.length === 0 ? (
                <div className="text-center py-16 text-[var(--color-text-tertiary)] bg-black/5 rounded-[24px] border border-black/5">No data for this week</div>
              ) : (
                weeklyProjects.rows.map((row, i) => (
                  <li key={row.entityId} className="group flex items-center gap-5 p-4 rounded-[20px] bg-white border border-black/5 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_32px_-4px_rgba(0,0,0,0.06)] hover:border-[#81e6d9]/60 hover:-translate-y-0.5 transition-all duration-300">
                    <div className={`w-10 h-10 rounded-[14px] flex items-center justify-center font-mono font-bold text-[1.1rem] shrink-0 shadow-inner ${i === 0 ? 'bg-gradient-to-br from-[#f5ebd4] to-[#fcd34d] text-[#b45309]' : i === 1 ? 'bg-gradient-to-br from-slate-100 to-slate-300 text-slate-600' : i === 2 ? 'bg-gradient-to-br from-amber-100 to-amber-300 text-amber-800' : 'bg-black/5 text-[var(--color-text-secondary)]'}`}>
                      {row.rank}
                    </div>
                    <div className="min-w-0 flex-grow">
                      <Link href={`/projects/${row.slug}`} className="text-[1.05rem] text-[var(--color-text-primary)] font-semibold hover:text-[#0d9488] transition-colors truncate block leading-snug outline-none">
                        {row.title}
                      </Link>
                      <div className="text-[0.85rem] font-medium text-[var(--color-text-tertiary)] mt-1 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" /> {row.score} new intents
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ol>
          </section>
        </div>

        {/* Contribution Podium */}
        <section className="p-8 md:p-12 rounded-[32px] bg-gradient-to-br from-[#f5ebd4]/20 to-[#81e6d9]/20 border border-white/60 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.04)] relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-[24px] bg-white flex items-center justify-center shadow-sm border border-black/5">
                <Star className="w-8 h-8 text-[#d97706]" />
              </div>
              <div>
                <h2 className="text-3xl font-semibold tracking-tight text-[var(--color-text-primary)] m-0">Contribution Hall of Fame</h2>
                <p className="text-[1.05rem] text-[var(--color-text-secondary)] m-0 mt-1">All-time top contributors by credit score</p>
              </div>
            </div>
            <Sparkles className="w-8 h-8 text-[#81e6d9] opacity-50" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
            {contributionLeaderboard.map((user, index) => (
              <div key={user.userId} className="group bg-[rgba(255,255,255,0.85)] backdrop-blur-[12px] border border-white/60 rounded-[24px] p-6 flex items-center gap-5 hover:bg-white hover:shadow-[0_16px_48px_-8px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300">
                <div className={`w-14 h-14 rounded-[16px] flex items-center justify-center font-mono font-bold text-2xl shrink-0 shadow-inner ${
                  index === 0 ? 'bg-gradient-to-br from-[#f5ebd4] to-[#fcd34d] text-[#b45309] shadow-[0_0_24px_rgba(245,235,212,0.6)]' : 
                  index === 1 ? 'bg-gradient-to-br from-slate-100 to-slate-300 text-slate-600' : 
                  index === 2 ? 'bg-gradient-to-br from-amber-100 to-amber-300 text-amber-800' : 
                  'bg-black/5 text-[var(--color-text-secondary)]'
                }`}>
                  {index + 1}
                </div>
                <div className="min-w-0 flex-grow">
                  <div className="text-[1.1rem] text-[var(--color-text-primary)] font-semibold truncate leading-snug mb-1">
                    {user.userId}
                  </div>
                  <div className="text-[0.95rem] font-mono font-bold text-[var(--color-accent-apple)] flex items-baseline gap-1">
                    {user.score.toLocaleString()} <span className="text-[0.75rem] font-sans font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">Credits</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* All-time Leaderboards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* All-time Discussions */}
          <section className="p-8 rounded-[32px] bg-[rgba(255,255,255,0.6)] backdrop-blur-[24px] saturate-[150%] shadow-sm border border-white/60">
            <div className="flex items-center gap-3 mb-8">
              <Trophy className="w-6 h-6 text-[var(--color-text-tertiary)]" />
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-[var(--color-text-primary)] m-0">All-Time Discussions</h2>
                <p className="text-[0.85rem] text-[var(--color-text-secondary)] m-0 mt-1">Ranked by total comments</p>
              </div>
            </div>

            <ol className="space-y-2">
              {discussions.map((row, index) => (
                <li key={row.postId} className="flex items-center gap-4 p-3 rounded-[16px] hover:bg-white hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.04)] transition-all">
                  <div className="w-8 h-8 rounded-[10px] flex items-center justify-center font-mono font-bold text-[0.85rem] shrink-0 bg-black/5 text-[var(--color-text-secondary)]">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-grow flex items-center justify-between gap-4">
                    <Link href={`/discussions/${row.slug}`} className="text-[0.95rem] text-[var(--color-text-primary)] font-medium hover:text-[var(--color-accent-apple)] transition-colors truncate outline-none">
                      {row.title}
                    </Link>
                    <span className="text-[0.85rem] font-mono font-bold text-[var(--color-text-tertiary)] shrink-0 bg-black/5 px-2.5 py-1 rounded-[8px]">{row.commentCount}</span>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* All-time Projects */}
          <section className="p-8 rounded-[32px] bg-[rgba(255,255,255,0.6)] backdrop-blur-[24px] saturate-[150%] shadow-sm border border-white/60">
            <div className="flex items-center gap-3 mb-8">
              <Trophy className="w-6 h-6 text-[var(--color-text-tertiary)]" />
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-[var(--color-text-primary)] m-0">All-Time Projects</h2>
                <p className="text-[0.85rem] text-[var(--color-text-secondary)] m-0 mt-1">Ranked by total collaboration intents</p>
              </div>
            </div>

            <ol className="space-y-2">
              {projects.map((row, index) => (
                <li key={row.projectId} className="flex items-center gap-4 p-3 rounded-[16px] hover:bg-white hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.04)] transition-all">
                  <div className="w-8 h-8 rounded-[10px] flex items-center justify-center font-mono font-bold text-[0.85rem] shrink-0 bg-black/5 text-[var(--color-text-secondary)]">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-grow flex items-center justify-between gap-4">
                    <Link href={`/projects/${row.slug}`} className="text-[0.95rem] text-[var(--color-text-primary)] font-medium hover:text-[var(--color-accent-apple)] transition-colors truncate outline-none">
                      {row.title}
                    </Link>
                    <span className="text-[0.85rem] font-mono font-bold text-[var(--color-text-tertiary)] shrink-0 bg-black/5 px-2.5 py-1 rounded-[8px]">{row.intentCount}</span>
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
