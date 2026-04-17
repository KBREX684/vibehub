import Link from "next/link";
import { notFound } from "next/navigation";
import { TeamDetailActions } from "@/components/team-detail-actions";
import { TeamMilestonesPanel } from "@/components/team-milestones-panel";
import { TeamTasksPanel } from "@/components/team-tasks-panel";
import { TeamChatPanel } from "@/components/team-chat-panel";
import { TeamDiscussionsPanel } from "@/components/team-discussions-panel";
import { TeamActivityTimeline } from "@/components/team-activity-timeline";
import { getSessionUserFromCookie } from "@/lib/auth";
import { getTeamBySlug, listTeamMilestones, getGitHubRepoStats } from "@/lib/repository";
import { Avatar } from "@/components/ui";

const TEAM_HERO_INITIAL_CLASS =
  "w-16 h-16 rounded-[var(--radius-xl)] bg-gradient-to-br from-[var(--color-accent-violet-subtle)] to-[var(--color-primary-subtle)] flex items-center justify-center text-2xl font-bold text-[var(--color-accent-violet)] border border-[var(--color-border)] shrink-0";
import {
  ArrowLeft,
  Users,
  GitFork,
  Star,
  GitBranch,
  Globe,
  ExternalLink,
  Settings2,
  Bot,
} from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function TeamDetailPage({ params }: Props) {
  const { slug } = await params;
  const session = await getSessionUserFromCookie();
  const team = await getTeamBySlug(slug, session?.userId ?? null);

  if (!team) notFound();

  const viewerId = session?.userId ?? null;
  const isMember = viewerId != null && team.members.some((m) => m.userId === viewerId);
  const viewerRole = team.viewerRole;
  const canManageTeam = viewerRole === "owner" || viewerRole === "admin";

  const [taskMilestones, githubStats] = await Promise.all([
    isMember
      ? listTeamMilestones({ teamSlug: slug, viewerUserId: viewerId })
      : Promise.resolve([]),
    (team.githubRepoUrl || team.githubOrgUrl)
      ? getGitHubRepoStats(team.githubRepoUrl ?? team.githubOrgUrl ?? "").catch(() => null)
      : Promise.resolve(null),
  ]);

  return (
    <main className="container pb-24 pt-6 space-y-6">

      {/* Back */}
      <Link
        href="/teams"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Teams
      </Link>

      {/* Hero */}
      <section className="card p-6 md:p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-accent-violet-subtle)] via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-start gap-6">
            {/* Avatar */}
            <div className={TEAM_HERO_INITIAL_CLASS}>
              {team.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)] mb-1">
                {team.name}
              </h1>
              <p className="text-xs text-[var(--color-text-muted)] mb-2">/{team.slug}</p>
              {team.mission && (
                <p className="text-sm text-[var(--color-text-secondary)] mb-4 max-w-xl">
                  {team.mission}
                </p>
              )}

              {/* Stats */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--color-text-muted)]">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {team.memberCount} member{team.memberCount !== 1 ? "s" : ""}
                </span>
                <span className="flex items-center gap-1">
                  <GitFork className="w-3.5 h-3.5" />
                  {team.projectCount} project{team.projectCount !== 1 ? "s" : ""}
                </span>
                {githubStats && (
                  <>
                    <span className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5" />
                      {githubStats.stars}
                    </span>
                    <span className="flex items-center gap-1">
                      <GitFork className="w-3.5 h-3.5" />
                      {githubStats.forks}
                    </span>
                    {githubStats.language && (
                      <span className="tag">{githubStats.language}</span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* External links — kept for GitHub only; chat is now in-app */}
          {(team.githubRepoUrl || team.githubOrgUrl) && (
            <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-[var(--color-border-subtle)]">
              <a href={team.githubRepoUrl ?? team.githubOrgUrl ?? "#"} target="_blank" rel="noreferrer" className="btn btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5" />
                GitHub
              </a>
              {/* Legacy external chat links shown as reference only */}
              {team.discordUrl && (
                <a href={team.discordUrl} target="_blank" rel="noreferrer" className="btn btn-ghost text-xs px-3 py-1.5 flex items-center gap-1.5 text-[var(--color-text-muted)]">
                  <Globe className="w-3.5 h-3.5" />
                  Discord ↗
                </a>
              )}
              {team.telegramUrl && (
                <a href={team.telegramUrl} target="_blank" rel="noreferrer" className="btn btn-ghost text-xs px-3 py-1.5 flex items-center gap-1.5 text-[var(--color-text-muted)]">
                  <Globe className="w-3.5 h-3.5" />
                  Telegram ↗
                </a>
              )}
            </div>
          )}
          {isMember && (
            <div className="mt-5 pt-5 border-t border-[var(--color-border-subtle)] flex flex-wrap gap-2">
              <Link
                href={`/teams/${encodeURIComponent(team.slug)}/agents`}
                className="btn btn-secondary text-xs px-3 py-1.5 inline-flex items-center gap-1.5"
              >
                <Bot className="w-3 h-3" aria-hidden="true" />
                Agent bus
              </Link>
              {canManageTeam && (
                <Link
                  href={`/teams/${encodeURIComponent(team.slug)}/settings`}
                  className="btn btn-secondary text-xs px-3 py-1.5 inline-flex items-center gap-1.5"
                >
                  <Settings2 className="w-3 h-3" aria-hidden="true" />
                  Team settings
                </Link>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* Main col */}
        <div className="lg:col-span-8 space-y-5">

          {/* Members */}
          <section className="card p-5">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-[var(--color-accent-violet)]" />
              Members ({team.memberCount})
            </h2>
            <div className="space-y-2">
              {team.members.map((m, i) => (
                <div key={m.userId} className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-elevated)] transition-colors">
                  <Avatar tone="neutral" size="sm" initial={String(i + 1)} alt={`Rank ${i + 1}`} />
                  <Avatar tone="neutral" size="md" initial={m.name.charAt(0)} alt={m.name} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-[var(--color-text-primary)]">{m.name}</div>
                    <div className="text-xs text-[var(--color-text-muted)]">{m.email}</div>
                  </div>
                  <span className={`tag ${m.role === "owner" ? "tag-violet" : ""} capitalize`}>
                    {m.role}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Team Projects */}
          <section className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                <GitFork className="w-4 h-4 text-[var(--color-primary-hover)]" />
                Team Projects ({team.projectCount})
              </h2>
              <Link
                href={`/discover?team=${encodeURIComponent(team.slug)}`}
                className="text-xs text-[var(--color-primary-hover)] hover:underline flex items-center gap-1"
              >
                Browse all
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
            {team.teamProjects && team.teamProjects.length > 0 ? (
              <div className="space-y-2">
                {team.teamProjects.map((p) => (
                  <Link
                    key={p.slug}
                    href={`/projects/${p.slug}`}
                    className="flex items-center justify-between p-3 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-elevated)] transition-colors group"
                  >
                    <div>
                      <div className="text-sm font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-primary-hover)] transition-colors">
                        {p.title}
                      </div>
                      <div className="text-xs text-[var(--color-text-muted)]">{p.oneLiner}</div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-[var(--color-text-muted)] group-hover:text-[var(--color-primary-hover)] transition-colors shrink-0" />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--color-text-muted)] py-4 text-center">
                No projects yet. Create a project and link it to this team.
              </p>
            )}
          </section>

          {/* Tasks Panel */}
          <TeamTasksPanel
            teamSlug={team.slug}
            members={team.members}
            milestones={taskMilestones}
            currentUserId={session?.userId ?? null}
            viewerRole={viewerRole}
          />

          <TeamMilestonesPanel teamSlug={team.slug} currentUserId={session?.userId ?? null} />

          <TeamDiscussionsPanel teamSlug={team.slug} currentUserId={session?.userId ?? null} />

          {/* Team Chat — in-app real-time chat (replaces external links) */}
          <TeamChatPanel
            teamSlug={team.slug}
            currentUser={
              session
                ? {
                    id:   session.userId,
                    name: session.name,
                  }
                : null
            }
            isMember={isMember}
          />
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-20">
          <TeamDetailActions team={team} currentUserId={session?.userId ?? null} />
          <TeamActivityTimeline teamSlug={team.slug} currentUserId={session?.userId ?? null} />
        </div>
      </div>
    </main>
  );
}
