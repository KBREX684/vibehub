import Link from "next/link";
import { Users, ArrowRight } from "lucide-react";
import { listTeamsForUser } from "@/lib/repository";
import { getServerTranslator } from "@/lib/i18n";
import { TagPill } from "@/components/ui";

const TEAM_CARD_INITIAL_CLASS =
  "w-10 h-10 rounded-[var(--radius-lg)] bg-gradient-to-br from-[var(--color-accent-violet-subtle)] to-[var(--color-primary-subtle)] flex items-center justify-center text-sm font-bold text-[var(--color-accent-violet)] shrink-0";

interface Props {
  userId: string;
}

export async function CreatorTeamsSection({ userId }: Props) {
  const { t } = await getServerTranslator();
  const teams = await listTeamsForUser(userId);
  if (teams.length === 0) {
    return null;
  }

  return (
    <section className="pt-8">
      <div className="flex items-center gap-3 mb-6 px-1">
        <Users className="w-6 h-6 text-[var(--color-text-tertiary)]" />
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)] m-0">{t("nav.teams", "Teams")}</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl">
        {teams.map((team) => (
          <Link
            key={team.id}
            href={`/work/team/${encodeURIComponent(team.slug)}`}
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
                <TagPill accent="success" mono size="sm" className="shrink-0">
                  {t("team.member_count", "{count} members").replace("{count}", String(team.memberCount))}
                </TagPill>
              </div>
              {team.mission && <p className="text-xs text-[var(--color-text-muted)] line-clamp-2 m-0">{team.mission}</p>}
              <span className="text-xs text-[var(--color-primary-hover)] mt-2 inline-flex items-center gap-1">
                {t("notifications.open_team", "打开团队工作区")}
                <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
