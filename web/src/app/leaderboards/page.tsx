import Link from "next/link";
import {
  getDiscussionLeaderboard,
  getProjectCollaborationLeaderboard,
  getWeeklyLeaderboardPublicPayload,
  parseUtcWeekStartParam,
  startOfUtcWeekContaining,
  listContributionLeaderboard,
} from "@/lib/repository";
import {
  Trophy,
  Flame,
  Users,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Medal,
  Star,
  MessageSquare,
  Activity,
} from "lucide-react";

function formatWeekRangeLabel(weekStart: Date): string {
  const end = new Date(weekStart.getTime());
  end.setUTCDate(end.getUTCDate() + 6);
  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, "0")}.${String(d.getUTCDate()).padStart(2, "0")}`;
  return `${fmt(weekStart)} – ${fmt(end)}`;
}

function addDaysUtc(d: Date, days: number): Date {
  const next = new Date(d.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function toWeekParam(weekStart: Date): string {
  return `${weekStart.getUTCFullYear()}-${String(weekStart.getUTCMonth() + 1).padStart(2, "0")}-${String(weekStart.getUTCDate()).padStart(2, "0")}`;
}

const RANK_STYLES = [
  "bg-gradient-to-br from-[var(--color-featured-subtle)] to-[rgba(245,158,11,0.15)] text-[var(--color-featured)]",
  "bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)]",
  "bg-[rgba(139,92,246,0.12)] text-[var(--color-accent-violet)]",
];

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LeaderboardsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const weekRaw = typeof sp.week === "string" ? sp.week : undefined;
  const weekStart = weekRaw?.trim()
    ? parseUtcWeekStartParam(weekRaw)
    : startOfUtcWeekContaining(new Date());

  const effectiveWeek = weekStart ?? startOfUtcWeekContaining(new Date());
  const prevWeek = addDaysUtc(effectiveWeek, -7);
  const nextWeek = addDaysUtc(effectiveWeek, 7);
  const nowWeek = startOfUtcWeekContaining(new Date());
  const invalidWeek = weekRaw?.trim() && !weekStart;

  const [discussions, projects, weeklyDisc, weeklyProj, contributionLB] =
    await Promise.all([
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
    <main className="container pb-24 space-y-12 pt-8">

      {/* Hero */}
      <section className="page-hero text-center pb-8 border-b border-[var(--color-border)]">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-[var(--radius-pill)] bg-[var(--color-featured-subtle)] border border-[rgba(245,158,11,0.2)] text-xs font-medium text-[var(--color-featured)] mb-6">
          <Medal className="w-3.5 h-3.5" />
          VibeHub Leaderboards
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[var(--color-text-primary)] mb-3">
          Community Rankings
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] max-w-lg mx-auto mb-8">
          Track the most influential discussions, projects, and contributors across
          the VibeHub ecosystem.
        </p>

        {/* Week selector */}
        <div className="inline-flex items-center gap-2 bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-1.5">
          <Link
            href={`/leaderboards?week=${toWeekParam(prevWeek)}`}
            className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)] rounded-[var(--radius-md)] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2 px-4 text-sm font-medium text-[var(--color-text-primary)]">
            <Calendar className="w-3.5 h-3.5 text-[var(--color-primary-hover)]" />
            {formatWeekRangeLabel(effectiveWeek)}
          </div>
          <Link
            href={`/leaderboards?week=${toWeekParam(nextWeek)}`}
            className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)] rounded-[var(--radius-md)] transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </Link>
          {effectiveWeek.getTime() !== nowWeek.getTime() && (
            <Link
              href="/leaderboards"
              className="btn btn-primary text-xs px-3 py-1.5 ml-1"
            >
              Current Week
            </Link>
          )}
        </div>

        {invalidWeek && (
          <p className="text-[var(--color-error)] text-xs mt-4 bg-[var(--color-error-subtle)] inline-block px-4 py-2 rounded-[var(--radius-md)] border border-[rgba(239,68,68,0.2)]">
            Invalid date — showing current week
          </p>
        )}
      </section>

      {/* Weekly Leaderboards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Weekly Discussions */}
        <section className="card p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-warning-subtle)] rounded-full blur-[60px] -translate-y-1/2 translate-x-1/4 pointer-events-none" />
          <div className="flex items-center justify-between mb-6 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--color-warning-subtle)] flex items-center justify-center">
                <Flame className="w-5 h-5 text-[var(--color-warning)]" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Hot Discussions</h2>
                <p className="text-xs text-[var(--color-text-muted)]">By new comments this week</p>
              </div>
            </div>
            <span className="tag">{weeklyDisc.source === "materialized" ? "Snapshot" : "Live"}</span>
          </div>
          <ol className="space-y-2 relative z-10">
            {weeklyDisc.rows.length === 0 ? (
              <li className="text-center py-10 text-sm text-[var(--color-text-muted)]">No data for this week</li>
            ) : (
              weeklyDisc.rows.map((row, i) => (
                <li key={row.entityId} className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-elevated)] transition-colors group">
                  <div className={`w-8 h-8 rounded-[var(--radius-md)] flex items-center justify-center text-xs font-bold shrink-0 ${RANK_STYLES[i] ?? "bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]"}`}>
                    {row.rank}
                  </div>
                  <div className="min-w-0 flex-1 flex items-center justify-between gap-3">
                    <Link
                      href={`/discussions/${row.slug}`}
                      className="text-sm text-[var(--color-text-primary)] font-medium hover:text-[var(--color-primary-hover)] transition-colors truncate"
                    >
                      {row.title}
                    </Link>
                    <span className="text-xs font-mono font-bold text-[var(--color-text-muted)] shrink-0 bg-[var(--color-bg-elevated)] px-2 py-0.5 rounded">
                      {row.score}
                    </span>
                  </div>
                </li>
              ))
            )}
          </ol>
        </section>

        {/* Weekly Projects */}
        <section className="card p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-accent-cyan-subtle)] rounded-full blur-[60px] -translate-y-1/2 translate-x-1/4 pointer-events-none" />
          <div className="flex items-center justify-between mb-6 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--color-accent-cyan-subtle)] flex items-center justify-center">
                <Activity className="w-5 h-5 text-[var(--color-accent-cyan)]" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Active Projects</h2>
                <p className="text-xs text-[var(--color-text-muted)]">By new collaboration intents</p>
              </div>
            </div>
            <span className="tag">{weeklyProj.source === "materialized" ? "Snapshot" : "Live"}</span>
          </div>
          <ol className="space-y-2 relative z-10">
            {weeklyProj.rows.length === 0 ? (
              <li className="text-center py-10 text-sm text-[var(--color-text-muted)]">No data for this week</li>
            ) : (
              weeklyProj.rows.map((row, i) => (
                <li key={row.entityId} className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-elevated)] transition-colors group">
                  <div className={`w-8 h-8 rounded-[var(--radius-md)] flex items-center justify-center text-xs font-bold shrink-0 ${RANK_STYLES[i] ?? "bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]"}`}>
                    {row.rank}
                  </div>
                  <div className="min-w-0 flex-1 flex items-center justify-between gap-3">
                    <Link
                      href={`/projects/${row.slug}`}
                      className="text-sm text-[var(--color-text-primary)] font-medium hover:text-[var(--color-primary-hover)] transition-colors truncate"
                    >
                      {row.title}
                    </Link>
                    <span className="text-xs font-mono font-bold text-[var(--color-text-muted)] shrink-0 bg-[var(--color-bg-elevated)] px-2 py-0.5 rounded">
                      {row.score}
                    </span>
                  </div>
                </li>
              ))
            )}
          </ol>
        </section>
      </div>

      {/* Contribution Hall of Fame */}
      <section className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--color-featured-subtle)] flex items-center justify-center">
            <Star className="w-5 h-5 text-[var(--color-featured)]" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Contribution Hall of Fame</h2>
            <p className="text-xs text-[var(--color-text-muted)]">All-time top contributors by credit score</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {contributionLB.map((user, index) => (
            <div key={user.userId} className="flex items-center gap-3 p-4 bg-[var(--color-bg-elevated)] rounded-[var(--radius-lg)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)] transition-all">
              <div className={`w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center text-sm font-bold shrink-0 ${RANK_STYLES[index] ?? "bg-[var(--color-bg-surface)] text-[var(--color-text-muted)]"}`}>
                {index + 1}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-[var(--color-text-primary)] truncate">{user.userId}</div>
                <div className="text-xs font-mono font-bold text-[var(--color-primary-hover)]">
                  {user.score.toLocaleString()} credits
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* All-time leaderboards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* All-time Discussions */}
        <section className="card p-6">
          <div className="flex items-center gap-3 mb-5">
            <Trophy className="w-5 h-5 text-[var(--color-text-muted)]" />
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">All-Time Discussions</h2>
              <p className="text-xs text-[var(--color-text-muted)]">By total comments</p>
            </div>
          </div>
          <ol className="space-y-1.5">
            {discussions.map((row, index) => (
              <li key={row.postId} className="flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-elevated)] transition-colors">
                <span className="w-6 h-6 flex items-center justify-center text-xs font-bold text-[var(--color-text-muted)] bg-[var(--color-bg-elevated)] rounded shrink-0">
                  {index + 1}
                </span>
                <Link
                  href={`/discussions/${row.slug}`}
                  className="text-xs text-[var(--color-text-primary)] font-medium hover:text-[var(--color-primary-hover)] transition-colors truncate flex-1"
                >
                  {row.title}
                </Link>
                <span className="text-xs font-mono text-[var(--color-text-muted)] shrink-0 flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  {row.commentCount}
                </span>
              </li>
            ))}
          </ol>
        </section>

        {/* All-time Projects */}
        <section className="card p-6">
          <div className="flex items-center gap-3 mb-5">
            <Trophy className="w-5 h-5 text-[var(--color-text-muted)]" />
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">All-Time Projects</h2>
              <p className="text-xs text-[var(--color-text-muted)]">By collaboration intents</p>
            </div>
          </div>
          <ol className="space-y-1.5">
            {projects.map((row, index) => (
              <li key={row.projectId} className="flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-elevated)] transition-colors">
                <span className="w-6 h-6 flex items-center justify-center text-xs font-bold text-[var(--color-text-muted)] bg-[var(--color-bg-elevated)] rounded shrink-0">
                  {index + 1}
                </span>
                <Link
                  href={`/projects/${row.slug}`}
                  className="text-xs text-[var(--color-text-primary)] font-medium hover:text-[var(--color-primary-hover)] transition-colors truncate flex-1"
                >
                  {row.title}
                </Link>
                <span className="text-xs font-mono text-[var(--color-text-muted)] shrink-0 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {row.intentCount}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </main>
  );
}
