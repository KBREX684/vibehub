import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { getSessionUserFromCookie } from "@/lib/auth";
import { getEnterpriseWorkspaceSummary } from "@/lib/repository";

export default async function EnterpriseWorkspacePage() {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return (
      <>
        <SiteHeader />
        <main className="container">
          <article className="card">
            <h1>企业工作台</h1>
            <p className="muted">请先登录后查看团队雷达与协作漏斗。</p>
            <a href="/api/v1/auth/demo-login?role=user&redirect=/workspace/enterprise" className="button ghost">
              Demo User
            </a>
          </article>
        </main>
      </>
    );
  }

  const { pendingJoinRequests, funnel, teams } = await getEnterpriseWorkspaceSummary({
    viewerUserId: session.userId,
  });

  return (
    <>
      <SiteHeader />
      <main className="container">
        <article className="card detail-full">
          <h1>企业工作台</h1>
          <p className="muted small">
            聚合你作为<strong>队长</strong>的待审批入队申请、协作意向漏斗，以及你已加入的团队。程序化访问需 API Key scope{" "}
            <code className="code-inline">read:enterprise:workspace</code>，见{" "}
            <Link href="/settings/api-keys" className="inline-link">
              API Keys
            </Link>
            ；MCP v2 见 <code className="code-inline">GET /api/v1/mcp/v2/manifest</code>。
          </p>
        </article>

        <section className="card">
          <h2>协作意向漏斗</h2>
          <ul className="leaderboard-list">
            <li>
              <strong>总提交</strong> {funnel.totalSubmissions}
            </li>
            <li>
              <strong>待审</strong> {funnel.pending}
            </li>
            <li>
              <strong>已通过</strong> {funnel.approved} · <strong>已拒绝</strong> {funnel.rejected}
            </li>
            <li>
              <strong>通过率</strong> {(funnel.approvalRate * 100).toFixed(1)}%
            </li>
          </ul>
        </section>

        <section className="card">
          <h2>待审批入队（你是队长）</h2>
          {pendingJoinRequests.length === 0 ? (
            <p className="muted small">暂无待处理申请。</p>
          ) : (
            <ol className="leaderboard-list">
              {pendingJoinRequests.map((r) => (
                <li key={r.id}>
                  <strong>{r.applicantName}</strong>
                  <div className="muted small">
                    {r.applicantEmail} · 团队{" "}
                    <Link href={`/teams/${encodeURIComponent(r.teamSlug)}`} className="inline-link">
                      {r.teamName}
                    </Link>
                  </div>
                  {r.message ? <p className="small">{r.message}</p> : null}
                  <div className="muted small">{new Date(r.createdAt).toLocaleString()}</div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="card">
          <h2>我的团队</h2>
          {teams.length === 0 ? (
            <p className="muted small">尚未加入团队。</p>
          ) : (
            <ul className="leaderboard-list">
              {teams.map((t) => (
                <li key={t.id}>
                  <Link href={`/teams/${encodeURIComponent(t.slug)}`} className="inline-link">
                    {t.name}
                  </Link>
                  <div className="muted small">
                    {t.memberCount} 成员 · {t.projectCount} 项目
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
