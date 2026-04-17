import Link from "next/link";
import { listTeams } from "@/lib/repository";
import { Users, Globe, Plus, GitFork } from "lucide-react";

const TEAM_CARD_INITIAL_CLASS =
  "w-10 h-10 rounded-[var(--radius-md)] bg-gradient-to-br from-[var(--color-accent-violet-subtle)] to-[var(--color-primary-subtle)] flex items-center justify-center text-base font-bold text-[var(--color-accent-violet)] shrink-0";

export default async function TeamsPage() {
  const { items, pagination } = await listTeams({ page: 1, limit: 50 });

  return (
    <main className="container pb-24 space-y-8 pt-8">

      {/* Page header */}
      <section className="page-hero flex flex-col sm:flex-row sm:items-center justify-between gap-5 pb-6 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-[var(--radius-xl)] bg-[var(--color-accent-violet-subtle)] flex items-center justify-center text-[var(--color-accent-violet)]">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)] mb-0.5">
              Find Your Crew
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {pagination.total} teams · Join active collaborations building AI-native products
            </p>
          </div>
        </div>

        <Link
          href="/teams/new"
          className="btn btn-primary text-sm px-5 py-2 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Create Team
        </Link>
      </section>

      {/* Teams grid */}
      {items.length === 0 ? (
        <div className="card p-16 text-center">
          <Users className="w-10 h-10 text-[var(--color-text-muted)] mx-auto mb-4 opacity-50" />
          <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-2">
            No teams yet
          </h3>
          <p className="text-sm text-[var(--color-text-secondary)] mb-4">
            Create the first team and start building together.
          </p>
          <Link href="/teams/new" className="btn btn-primary text-sm px-5 py-2 inline-flex">
            Create a Team
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((team) => (
            <Link
              key={team.id}
              href={`/teams/${team.slug}`}
              className="card p-5 group hover:-translate-y-0.5 transition-all duration-200 flex flex-col gap-4"
            >
              {/* Header */}
              <div className="flex items-start gap-3">
                <div className={TEAM_CARD_INITIAL_CLASS}>
                  {team.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-primary-hover)] transition-colors truncate">
                    {team.name}
                  </h3>
                  {team.mission && (
                    <p className="text-xs text-[var(--color-text-secondary)] line-clamp-1 mt-0.5">
                      {team.mission}
                    </p>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 text-xs text-[var(--color-text-muted)]">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {team.memberCount} member{team.memberCount !== 1 ? "s" : ""}
                </span>
                <span className="flex items-center gap-1">
                  <GitFork className="w-3.5 h-3.5" />
                  {team.projectCount} project{team.projectCount !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Links */}
              {(team.githubOrgUrl || team.discordUrl || team.slackUrl) && (
                <div className="flex items-center gap-2 pt-3 border-t border-[var(--color-border-subtle)]">
                  {team.githubOrgUrl && (
                    <span className="tag tag-cyan">GitHub</span>
                  )}
                  {team.discordUrl && (
                    <span className="tag tag-violet">Discord</span>
                  )}
                  {team.slackUrl && (
                    <span className="tag tag-blue">Slack</span>
                  )}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* Create team CTA */}
      <div className="card p-8 text-center border-dashed">
        <Globe className="w-8 h-8 text-[var(--color-text-muted)] mx-auto mb-3 opacity-60" />
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-1.5">
          Building something?
        </h3>
        <p className="text-xs text-[var(--color-text-secondary)] mb-4 max-w-sm mx-auto">
          Create a team to organize your collaborators, track milestones, and
          recruit contributors.
        </p>
        <Link href="/teams/new" className="btn btn-secondary text-sm px-5 py-2 inline-flex">
          <Plus className="w-3.5 h-3.5" />
          Create your team
        </Link>
      </div>
    </main>
  );
}
