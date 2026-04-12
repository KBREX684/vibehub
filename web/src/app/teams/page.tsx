import Link from "next/link";
import { CreateTeamForm } from "@/components/create-team-form";
import { SiteHeader } from "@/components/site-header";
import { listTeams } from "@/lib/repository";

export default async function TeamsPage() {
  const { items, pagination } = await listTeams({ page: 1, limit: 50 });

  return (
    <>
      <SiteHeader />
      <main className="container section">
        <h1>团队（P3-1）</h1>
        <p className="muted">
          Team 空间：创建团队、公开列表；入队需<strong>申请并由队长审批</strong>（P3-2），队长也可按邮箱直接邀请。API：{" "}
          <code className="code-inline">POST /api/v1/teams/:slug/join</code>（提交申请）、{" "}
          <code className="code-inline">POST .../join-requests/:id/review</code>（队长审批）。
        </p>

        <div style={{ display: "grid", gap: "1.5rem", marginTop: "1.5rem" }}>
          <CreateTeamForm />

          <section className="card">
            <h2>全部团队</h2>
            <p className="muted small">共 {pagination.total} 个</p>
            {items.length === 0 ? (
              <p className="muted">暂无团队，创建第一个。</p>
            ) : (
              <ul className="leaderboard-list" style={{ listStyle: "none", padding: 0 }}>
                {items.map((t) => (
                  <li key={t.id} style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <Link href={`/teams/${t.slug}`} className="inline-link">
                      {t.name}
                    </Link>
                    <span className="muted small">
                      /{t.slug} · {t.memberCount} 人 · {t.projectCount} 个项目
                      {t.mission ? ` · ${t.mission}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
