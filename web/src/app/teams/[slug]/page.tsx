import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { TeamDetailActions } from "@/components/team-detail-actions";
import { TeamTasksPanel } from "@/components/team-tasks-panel";
import { getSessionUserFromCookie } from "@/lib/auth";
import { getTeamBySlug } from "@/lib/repository";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function TeamDetailPage({ params }: Props) {
  const { slug } = await params;
  const session = await getSessionUserFromCookie();
  const team = await getTeamBySlug(slug, session?.userId ?? null);
  if (!team) {
    notFound();
  }

  return (
    <>
      <SiteHeader />
      <main className="container detail">
        <article className="card detail-full">
          <p className="muted small">
            <Link href="/teams" className="inline-link">
              ← 团队列表
            </Link>
          </p>
          <h1>{team.name}</h1>
          <p className="muted">/{team.slug}</p>
          {team.mission ? <p>{team.mission}</p> : null}
        </article>

        <section className="card">
          <h2>成员（{team.memberCount}）</h2>
          <ol className="leaderboard-list">
            {team.members.map((m, i) => (
              <li key={m.userId}>
                <span className="rank-pill">{i + 1}</span>
                <div>
                  <strong>{m.name}</strong>
                  <div className="muted small">
                    {m.email} · {m.role === "owner" ? "队长" : "成员"} ·{" "}
                    {new Date(m.joinedAt).toLocaleString()}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="card">
          <h2>团队项目（{team.projectCount}）</h2>
          {team.teamProjects && team.teamProjects.length > 0 ? (
            <ul className="leaderboard-list">
              {team.teamProjects.map((p) => (
                <li key={p.slug}>
                  <Link href={`/projects/${p.slug}`} className="inline-link">
                    {p.title}
                  </Link>
                  <div className="muted small">{p.oneLiner}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small">暂无关联项目。创建者在项目页可绑定本团队。</p>
          )}
          <p className="muted small" style={{ marginTop: "0.75rem" }}>
            在{" "}
            <Link href={`/discover?team=${encodeURIComponent(team.slug)}`} className="inline-link">
              发现页按本团队筛选
            </Link>
            。
          </p>
        </section>

        <TeamTasksPanel teamSlug={team.slug} members={team.members} currentUserId={session?.userId ?? null} />

        <TeamDetailActions team={team} currentUserId={session?.userId ?? null} />
      </main>
    </>
  );
}
