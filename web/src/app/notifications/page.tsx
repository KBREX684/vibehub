import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { getSessionUserFromCookie } from "@/lib/auth";
import { listInAppNotifications } from "@/lib/repository";

export default async function NotificationsPage() {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return (
      <>
        <SiteHeader />
        <main className="container">
          <article className="card">
            <h1>通知</h1>
            <p className="muted">登录后查看入队审批与任务分配等站内提醒。</p>
            <a href="/api/v1/auth/demo-login?role=user&redirect=/notifications" className="button ghost">
              Demo User
            </a>
          </article>
        </main>
      </>
    );
  }

  const items = await listInAppNotifications({ userId: session.userId, limit: 80 });

  return (
    <>
      <SiteHeader />
      <main className="container">
        <article className="card detail-full">
          <h1>通知</h1>
          <p className="muted small">
            与团队入队、任务分配相关的提醒。已读状态可通过{" "}
            <code className="code-inline">PATCH /api/v1/me/notifications</code> 更新。
          </p>
        </article>

        <section className="card">
          {items.length === 0 ? (
            <p className="muted small">暂无通知。申请加入团队或被分配任务后会出现在这里。</p>
          ) : (
            <ol className="leaderboard-list">
              {items.map((n) => (
                <li key={n.id}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", flexWrap: "wrap" }}>
                    <strong>{n.title}</strong>
                    {!n.readAt ? (
                      <span className="rank-pill" style={{ fontSize: "0.7rem" }}>
                        未读
                      </span>
                    ) : null}
                  </div>
                  <p className="small" style={{ marginTop: "0.35rem" }}>
                    {n.body}
                  </p>
                  {typeof n.metadata?.teamSlug === "string" ? (
                    <p className="muted small" style={{ marginTop: "0.25rem" }}>
                      <Link href={`/teams/${encodeURIComponent(String(n.metadata.teamSlug))}`} className="inline-link">
                        打开团队
                      </Link>
                    </p>
                  ) : null}
                  <div className="muted small" style={{ marginTop: "0.25rem" }}>
                    {new Date(n.createdAt).toLocaleString()}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </main>
    </>
  );
}
