import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import {
  getDiscussionLeaderboard,
  getProjectCollaborationLeaderboard,
  getWeeklyLeaderboardPublicPayload,
  parseUtcWeekStartParam,
  startOfUtcWeekContaining,
} from "@/lib/repository";

function formatWeekRangeLabel(weekStart: Date): string {
  const end = new Date(weekStart.getTime());
  end.setUTCDate(end.getUTCDate() + 6);
  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  return `${fmt(weekStart)} – ${fmt(end)}（UTC）`;
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

  const [discussions, projects, weeklyDiscussions, weeklyProjects] = await Promise.all([
    getDiscussionLeaderboard(15),
    getProjectCollaborationLeaderboard(15),
    getWeeklyLeaderboardPublicPayload({
      weekStart: effectiveWeek,
      kind: "discussions_by_weekly_comment_count",
      limit: 15,
    }),
    getWeeklyLeaderboardPublicPayload({
      weekStart: effectiveWeek,
      kind: "projects_by_weekly_collaboration_intent_count",
      limit: 15,
    }),
  ]);

  return (
    <>
      <SiteHeader />
      <main className="container section">
        <h1>榜单</h1>
        <p className="muted">
          P2-3：全量历史榜（讨论按评论总数、项目按协作意向总数）。P2-5：UTC 自然周（周一至周日）周榜；管理员可物化快照后公开接口优先读快照。周榜接口：{" "}
          <code className="code-inline">GET /api/v1/leaderboards/weekly/discussions</code>、{" "}
          <code className="code-inline">GET /api/v1/leaderboards/weekly/projects</code>
          （可选 <code className="code-inline">week=YYYY-MM-DD</code> 须为周一）。
        </p>

        {invalidWeek ? (
          <p className="error-text" style={{ marginBottom: "1rem" }}>
            无效的 week 参数：请使用 UTC 周一的日期（YYYY-MM-DD）。已改为当前周。
          </p>
        ) : null}

        <nav className="discover-pagination" aria-label="周切换" style={{ marginBottom: "1.25rem" }}>
          <Link href={`/leaderboards?week=${toWeekQueryParam(prevWeek)}`} className="button ghost">
            上一周
          </Link>
          <span className="muted small" style={{ alignSelf: "center" }}>
            {formatWeekRangeLabel(effectiveWeek)}
          </span>
          <Link href={`/leaderboards?week=${toWeekQueryParam(nextWeek)}`} className="button ghost">
            下一周
          </Link>
          {effectiveWeek.getTime() !== nowWeek.getTime() ? (
            <Link href="/leaderboards" className="button ghost">
              本周
            </Link>
          ) : null}
        </nav>

        <div className="leaderboard-grid">
          <section className="card leaderboard-panel">
            <h2>讨论热度（全量）</h2>
            <p className="muted small">已发布帖子 · 按评论总数</p>
            <ol className="leaderboard-list">
              {discussions.map((row, index) => (
                <li key={row.postId}>
                  <span className="rank-pill">{index + 1}</span>
                  <div>
                    <Link href={`/discussions#${row.slug}`} className="inline-link">
                      {row.title}
                    </Link>
                    <div className="muted small">{row.commentCount} 条评论</div>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="card leaderboard-panel">
            <h2>协作意向活跃项目（全量）</h2>
            <p className="muted small">全部意向提交数（含待审核）</p>
            <ol className="leaderboard-list">
              {projects.map((row, index) => (
                <li key={row.projectId}>
                  <span className="rank-pill">{index + 1}</span>
                  <div>
                    <Link href={`/projects/${row.slug}`} className="inline-link">
                      {row.title}
                    </Link>
                    <div className="muted small">{row.intentCount} 条协作意向</div>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="card leaderboard-panel">
            <h2>讨论周榜</h2>
            <p className="muted small">
              周内新增评论数 · 来源：{weeklyDiscussions.source === "materialized" ? "物化快照" : "实时计算"}
              {weeklyDiscussions.generatedAt ? ` · ${weeklyDiscussions.generatedAt}` : ""}
            </p>
            <ol className="leaderboard-list">
              {weeklyDiscussions.rows.map((row) => (
                <li key={row.entityId}>
                  <span className="rank-pill">{row.rank}</span>
                  <div>
                    <Link href={`/discussions#${row.slug}`} className="inline-link">
                      {row.title}
                    </Link>
                    <div className="muted small">{row.score} 条本周评论</div>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="card leaderboard-panel">
            <h2>项目周榜</h2>
            <p className="muted small">
              周内新增协作意向 · 来源：{weeklyProjects.source === "materialized" ? "物化快照" : "实时计算"}
              {weeklyProjects.generatedAt ? ` · ${weeklyProjects.generatedAt}` : ""}
            </p>
            <ol className="leaderboard-list">
              {weeklyProjects.rows.map((row) => (
                <li key={row.entityId}>
                  <span className="rank-pill">{row.rank}</span>
                  <div>
                    <Link href={`/projects/${row.slug}`} className="inline-link">
                      {row.title}
                    </Link>
                    <div className="muted small">{row.score} 条本周意向</div>
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
