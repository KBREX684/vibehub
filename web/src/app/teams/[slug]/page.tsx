import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { TeamDetailActions } from "@/components/team-detail-actions";
import { TeamMilestonesPanel } from "@/components/team-milestones-panel";
import { TeamTasksPanel } from "@/components/team-tasks-panel";
import { getSessionUserFromCookie } from "@/lib/auth";
import { getTeamBySlug, listTeamMilestones, getGitHubRepoStats } from "@/lib/repository";

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

  const viewerId = session?.userId ?? null;
  const isMember = viewerId != null && team.members.some((m) => m.userId === viewerId);
  const taskMilestones = isMember
    ? await listTeamMilestones({ teamSlug: slug, viewerUserId: viewerId })
    : [];

  // T-3: GitHub repo stats (non-blocking, best-effort)
  const githubStats = (team.githubRepoUrl || team.githubOrgUrl)
    ? await getGitHubRepoStats(team.githubRepoUrl ?? team.githubOrgUrl ?? "").catch(() => null)
    : null;

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

          {/* T-1: External chat links */}
          {(team.discordUrl || team.telegramUrl || team.slackUrl) ? (
            <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
              {team.discordUrl ? (
                <a href={team.discordUrl} target="_blank" rel="noreferrer" className="button ghost">
                  💬 Discord
                </a>
              ) : null}
              {team.telegramUrl ? (
                <a href={team.telegramUrl} target="_blank" rel="noreferrer" className="button ghost">
                  ✈️ Telegram
                </a>
              ) : null}
              {team.slackUrl ? (
                <a href={team.slackUrl} target="_blank" rel="noreferrer" className="button ghost">
                  💼 Slack
                </a>
              ) : null}
            </div>
          ) : null}

          {/* T-3: GitHub repo stats */}
          {(team.githubRepoUrl || team.githubOrgUrl) ? (
            <div style={{ marginTop: 12 }}>
              <a href={team.githubRepoUrl ?? team.githubOrgUrl} target="_blank" rel="noreferrer" className="inline-link">
                GitHub {team.githubOrgUrl && !team.githubRepoUrl ? "组织" : "仓库"}
              </a>
              {githubStats ? (
                <span className="muted small" style={{ marginLeft: 12 }}>
                  ⭐ {githubStats.stars} · 🍴 {githubStats.forks}
                  {githubStats.language ? ` · ${githubStats.language}` : ""}
                </span>
              ) : null}
            </div>
          ) : null}
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

        <TeamTasksPanel
          teamSlug={team.slug}
          members={team.members}
          milestones={taskMilestones}
          currentUserId={session?.userId ?? null}
        />

        <TeamMilestonesPanel teamSlug={team.slug} currentUserId={session?.userId ?? null} />

        <TeamDetailActions team={team} currentUserId={session?.userId ?? null} />
      </main>
    </>
  );
}
