import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { TeamDetailActions } from "@/components/team-detail-actions";
import { getSessionUserFromCookie } from "@/lib/auth";
import { getTeamBySlug } from "@/lib/repository";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function TeamDetailPage({ params }: Props) {
  const { slug } = await params;
  const team = await getTeamBySlug(slug);
  if (!team) {
    notFound();
  }

  const session = await getSessionUserFromCookie();

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

        <TeamDetailActions team={team} currentUserId={session?.userId ?? null} />
      </main>
    </>
  );
}
