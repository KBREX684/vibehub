import Link from "next/link";
import { Users, ArrowRight } from "lucide-react";
import { listTeamsForUser } from "@/lib/repository";

const TEAM_CARD_INITIAL_CLASS =
  "w-10 h-10 rounded-[var(--radius-lg)] bg-gradient-to-br from-[var(--color-accent-violet-subtle)] to-[var(--color-primary-subtle)] flex items-center justify-center text-sm font-bold text-[var(--color-accent-violet)] shrink-0";

interface Props {
  userId: string;
}

export async function CreatorTeamsSection({ userId }: Props) {
  const teams = await listTeamsForUser(userId);
  if (teams.length === 0) {
    return null;
  }

  return (
    <section className="pt-8">
      <div className="flex items-center gap-3 mb-6 px-1">
        <Users className="w-6 h-6 text-[var(--color-text-tertiary)]" />
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)] m-0">Teams</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl">
        {teams.map((team) => (
          <Link
            key={team.id}
            href={`/teams/${encodeURIComponent(team.slug)}`}
            className="card p-5 flex items-start gap-3 hover:-translate-y-0.5 transition-all duration-200 group"
          >
            <div className={TEAM_CARD_INITIAL_CLASS}>
              {team.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-primary-hover)] truncate">
                  {team.name}
                </span>
                <span className="tag tag-green shrink-0 text-[10px]">
                  {team.memberCount} member{team.memberCount !== 1 ? "s" : ""}
                </span>
              </div>
              {team.mission && <p className="text-xs text-[var(--color-text-muted)] line-clamp-2 m-0">{team.mission}</p>}
              <span className="text-xs text-[var(--color-primary-hover)] mt-2 inline-flex items-center gap-1">
                Open team
                <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
