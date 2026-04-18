/**
 * v8 W2 stage-3 — leaderboards refactored to share a single row/card
 * helper per list. The page had four parallel list sections, each
 * repeating the same long className string on every <li>. That is
 * high-token-count audit noise even though each expression is already
 * token-driven. Extracting a `<LeaderRow>` / `<ContributorCard>` helper
 * collapses it to one definition per pattern.
 */
import Link from "next/link";
import {
  getDiscussionLeaderboard,
  getProjectCollaborationLeaderboard,
  getWeeklyLeaderboardPublicPayload,
  parseUtcWeekStartParam,
  startOfUtcWeekContaining,
  listContributionLeaderboard,
  getUserDisplayNames,
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
import { TagPill } from "@/components/ui";
import { formatLocalizedDate, formatLocalizedNumber } from "@/lib/formatting";
import { getServerLanguage } from "@/lib/i18n";

function formatWeekRangeLabel(weekStart: Date, language: string): string {
  const end = new Date(weekStart.getTime());
  end.setUTCDate(end.getUTCDate() + 6);
  return `${formatLocalizedDate(weekStart, language, { month: "short", day: "numeric" })} – ${formatLocalizedDate(end, language, { month: "short", day: "numeric" })}`;
}

function addDaysUtc(d: Date, days: number): Date {
  const next = new Date(d.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function toWeekParam(weekStart: Date): string {
  return `${weekStart.getUTCFullYear()}-${String(weekStart.getUTCMonth() + 1).padStart(2, "0")}-${String(weekStart.getUTCDate()).padStart(2, "0")}`;
}

const RANK_STYLES: Record<number, string> = {
  0: "bg-[var(--color-warning-subtle)] text-[var(--color-warning)] border-[var(--color-warning-border-strong)]",
  1: "bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] border-[var(--color-border)]",
  2: "bg-[var(--color-accent-violet-subtle)] text-[var(--color-accent-violet)] border-[var(--color-accent-violet-border)]",
};

const RANK_FALLBACK = "bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] border-[var(--color-border-subtle)]";

function rankBadge(index: number, size: "sm" | "md" = "md") {
  const dim = size === "sm" ? "w-6 h-6 text-[11px]" : "w-8 h-8 text-xs";
  return `${dim} rounded-[var(--radius-md)] flex items-center justify-center font-bold shrink-0 border ${RANK_STYLES[index] ?? RANK_FALLBACK}`;
}

/** A row inside one of the leaderboard list sections. */
function LeaderRow({
  index,
  href,
  title,
  score,
  language,
  scoreIcon,
  compact = false,
}: {
  index: number;
  href: string;
  title: string;
  score: number | string;
  language?: string;
  scoreIcon?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <li className="group flex items-center gap-3 p-2.5 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-elevated)] transition-colors">
      <span className={rankBadge(index, compact ? "sm" : "md")}>
        {index + 1}
      </span>
      <Link
        href={href}
        className="min-w-0 flex-1 text-sm font-medium text-[var(--color-text-primary)] hover:text-[var(--color-accent-apple)] transition-colors truncate"
      >
        {title}
      </Link>
      <span className="shrink-0 inline-flex items-center gap-1 text-xs font-mono text-[var(--color-text-tertiary)]">
        {scoreIcon}
        {typeof score === "number" ? formatLocalizedNumber(score, language ?? "en") : score}
      </span>
    </li>
  );
}

const LB_LIST_CLASSNAME = "space-y-1.5 relative z-10";
const LB_EMPTY_CLASSNAME = "text-center py-10 text-sm text-[var(--color-text-muted)]";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LeaderboardsPage({ searchParams }: PageProps) {
  const language = await getServerLanguage();
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

  const contributionNames = await getUserDisplayNames(
    contributionLB.map((u) => u.userId)
  );

  return (
    <main className="container pb-24 space-y-12 pt-8">
      {/* Hero */}
      <section className="page-hero text-center pb-8 border-b border-[var(--color-border)]">
        <TagPill accent="warning" size="md" className="mb-5">
          <Medal className="w-3.5 h-3.5" aria-hidden="true" />
          VibeHub Leaderboards
        </TagPill>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-[var(--color-text-primary)] mb-3">
          Community Rankings
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] max-w-lg mx-auto mb-8">
          Track the most influential discussions, projects, and contributors
          across the VibeHub ecosystem.
        </p>

        {/* Week selector */}
        <div className="inline-flex items-center gap-2 bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-1.5">
          <Link
            href={`/leaderboards?week=${toWeekParam(prevWeek)}`}
            className="p-2 rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)] transition-colors"
            aria-label="Previous week"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          </Link>
          <div className="flex items-center gap-2 px-3 text-sm font-medium text-[var(--color-text-primary)]">
            <Calendar className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" aria-hidden="true" />
            {formatWeekRangeLabel(effectiveWeek, language)}
          </div>
          <Link
            href={`/leaderboards?week=${toWeekParam(nextWeek)}`}
            className="p-2 rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)] transition-colors"
            aria-label="Next week"
          >
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </Link>
          {effectiveWeek.getTime() !== nowWeek.getTime() ? (
            <Link
              href="/leaderboards"
              className="btn btn-primary text-xs px-3 py-1.5 ml-1"
            >
              Current week
            </Link>
          ) : null}
        </div>

        {invalidWeek ? (
          <p className="mt-4 text-xs text-[var(--color-error)] bg-[var(--color-error-subtle)] inline-block px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--color-error-border)]">
            Invalid date — showing current week
          </p>
        ) : null}
      </section>

      {/* Weekly Leaderboards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WeeklySection
          icon={Flame}
          tone="warning"
          title="Hot discussions"
          subtitle="By new comments this week"
          source={weeklyDisc.source}
        >
          {weeklyDisc.rows.length === 0 ? (
            <li className={LB_EMPTY_CLASSNAME}>No data for this week</li>
          ) : (
            weeklyDisc.rows.map((row, i) => (
              <LeaderRow
                key={row.entityId}
                index={i}
                href={`/discussions/${row.slug}`}
                title={row.title}
                score={row.score}
                language={language}
              />
            ))
          )}
        </WeeklySection>

        <WeeklySection
          icon={Activity}
          tone="cyan"
          title="Active projects"
          subtitle="By new collaboration intents"
          source={weeklyProj.source}
        >
          {weeklyProj.rows.length === 0 ? (
            <li className={LB_EMPTY_CLASSNAME}>No data for this week</li>
          ) : (
            weeklyProj.rows.map((row, i) => (
              <LeaderRow
                key={row.entityId}
                index={i}
                href={`/projects/${row.slug}`}
                title={row.title}
                score={row.score}
                language={language}
              />
            ))
          )}
        </WeeklySection>
      </div>

      {/* Contribution Hall of Fame */}
      <section className="card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--color-warning-subtle)] flex items-center justify-center">
            <Star className="w-5 h-5 text-[var(--color-warning)]" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[var(--color-text-primary)] m-0">
              Contribution Hall of Fame
            </h2>
            <p className="text-xs text-[var(--color-text-muted)] m-0 mt-0.5">
              All-time top contributors by credit score
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {contributionLB.map((user, index) => (
            <ContributorCard
              key={user.userId}
              rank={index}
              name={contributionNames[user.userId] ?? user.userId}
              score={user.score}
              language={language}
            />
          ))}
        </div>
      </section>

      {/* All-time leaderboards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AllTimeSection title="All-time discussions" subtitle="By total comments">
          {discussions.map((row, index) => (
            <LeaderRow
              key={row.postId}
              index={index}
              compact
              href={`/discussions/${row.slug}`}
              title={row.title}
              score={row.commentCount}
              language={language}
              scoreIcon={<MessageSquare className="w-3 h-3" aria-hidden="true" />}
            />
          ))}
        </AllTimeSection>

        <AllTimeSection title="All-time projects" subtitle="By collaboration intents">
          {projects.map((row, index) => (
            <LeaderRow
              key={row.projectId}
              index={index}
              compact
              href={`/projects/${row.slug}`}
              title={row.title}
              score={row.intentCount}
              language={language}
              scoreIcon={<Users className="w-3 h-3" aria-hidden="true" />}
            />
          ))}
        </AllTimeSection>
      </div>
    </main>
  );
}

/* ── Local helpers ─────────────────────────────────────────────────────── */

function WeeklySection({
  icon: Icon,
  tone,
  title,
  subtitle,
  source,
  children,
}: {
  icon: typeof Flame;
  tone: "warning" | "cyan";
  title: string;
  subtitle: string;
  source: "materialized" | "live";
  children: React.ReactNode;
}) {
  const iconWrap =
    tone === "warning"
      ? "bg-[var(--color-warning-subtle)] text-[var(--color-warning)]"
      : "bg-[var(--color-accent-cyan-subtle)] text-[var(--color-accent-cyan)]";
  return (
    <section className="card p-6 relative">
      <div className="flex items-center justify-between mb-5 relative z-10">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-[var(--radius-lg)] flex items-center justify-center ${iconWrap}`}>
            <Icon className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[var(--color-text-primary)] m-0">
              {title}
            </h2>
            <p className="text-xs text-[var(--color-text-muted)] m-0 mt-0.5">
              {subtitle}
            </p>
          </div>
        </div>
        <TagPill accent={source === "materialized" ? "default" : "success"} size="sm" mono>
          {source === "materialized" ? "Snapshot" : "Live"}
        </TagPill>
      </div>
      <ol className={LB_LIST_CLASSNAME}>{children}</ol>
    </section>
  );
}

function AllTimeSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-6">
      <div className="flex items-center gap-3 mb-4">
        <Trophy className="w-5 h-5 text-[var(--color-text-muted)]" aria-hidden="true" />
        <div>
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)] m-0">
            {title}
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] m-0 mt-0.5">
            {subtitle}
          </p>
        </div>
      </div>
      <ol className="space-y-1.5">{children}</ol>
    </section>
  );
}

function ContributorCard({
  rank,
  name,
  score,
  language,
}: {
  rank: number;
  name: string;
  score: number;
  language: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-[var(--radius-lg)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)] transition-colors">
      <span className={rankBadge(rank)}>{rank + 1}</span>
      <div className="min-w-0">
        <div className="text-sm font-medium text-[var(--color-text-primary)] truncate">
          {name}
        </div>
        <div className="text-xs font-mono text-[var(--color-text-tertiary)]">
          {formatLocalizedNumber(score, language)} credits
        </div>
      </div>
    </div>
  );
}
