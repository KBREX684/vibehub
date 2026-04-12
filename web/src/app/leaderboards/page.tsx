import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { getDiscussionLeaderboard, getProjectCollaborationLeaderboard } from "@/lib/repository";

export default async function LeaderboardsPage() {
  const [discussions, projects] = await Promise.all([
    getDiscussionLeaderboard(15),
    getProjectCollaborationLeaderboard(15),
  ]);

  return (
    <>
      <SiteHeader />
      <main className="container section">
        <h1>榜单</h1>
        <p className="muted">
          P2-3：讨论区按评论数周榜式排序（全量历史）；项目榜按协作意向提交总数排序。接口：{" "}
          <code className="code-inline">GET /api/v1/leaderboards/discussions</code>、{" "}
          <code className="code-inline">GET /api/v1/leaderboards/projects</code>
        </p>

        <div className="leaderboard-grid">
          <section className="card leaderboard-panel">
            <h2>讨论热度</h2>
            <p className="muted small">已发布帖子 · 按评论数</p>
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
            <h2>协作意向活跃项目</h2>
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
        </div>
      </main>
    </>
  );
}
