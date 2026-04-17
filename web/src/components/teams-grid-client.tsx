"use client";

import Link from "next/link";
import { Users, GitFork } from "lucide-react";
import { SpotlightCard } from "@/components/ui";
import type { TeamSummary } from "@/lib/types";

const TEAM_CARD_INITIAL_CLASS =
  "w-10 h-10 rounded-[var(--radius-md)] bg-gradient-to-br from-[var(--color-accent-violet-subtle)] to-[var(--color-primary-subtle)] flex items-center justify-center text-base font-bold text-[var(--color-accent-violet)] shrink-0";

export function TeamsGridClient({ teams }: { teams: TeamSummary[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {teams.map((team, i) => (
        <Link
          key={team.id}
          href={`/teams/${team.slug}`}
          className="block"
        >
          <SpotlightCard
            className="card p-5 group hover:-translate-y-0.5 transition-all duration-200 flex flex-col gap-4 h-full"
            spotlightColor="var(--color-spotlight-violet)"
            style={{
              opacity: 0,
              animation: `fade-in-up 0.5s cubic-bezier(0.16,1,0.3,1) ${i * 50}ms forwards`,
            }}
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
                {team.githubOrgUrl && <span className="tag tag-cyan">GitHub</span>}
                {team.discordUrl && <span className="tag tag-violet">Discord</span>}
                {team.slackUrl && <span className="tag tag-blue">Slack</span>}
              </div>
            )}
          </SpotlightCard>
        </Link>
      ))}
    </div>
  );
}
