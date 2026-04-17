import Link from "next/link";
import { Users, Sparkles, ArrowRight, Terminal } from "lucide-react";
import { getFollowFeed, listFeaturedProjects, listPosts } from "@/lib/repository";
import type { Project, SessionUser, TeamSummary } from "@/lib/types";
import { PostCard } from "@/components/post-card";
import { ProjectCard } from "@/components/project-card";
import { AnimatedSection, Avatar, BlurText } from "@/components/ui";
import { getServerTranslator } from "@/lib/i18n";

interface Props {
  session: SessionUser | null;
  projects: Project[];
  teams: TeamSummary[];
}

export async function HomeFeedSection({ session, projects, teams }: Props) {
  const { t } = await getServerTranslator();
  const [featured, followFeed, latestPosts] = await Promise.all([
    listFeaturedProjects(),
    session ? getFollowFeed(session.userId, { page: 1, limit: 8 }) : Promise.resolve(null),
    listPosts({ page: 1, limit: 8 }),
  ]);

  const feedPosts = session && followFeed ? followFeed.items : latestPosts.items;
  const feedEmpty = session && followFeed && followFeed.pagination.total === 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <div className="lg:col-span-7 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
            {session ? (
              <>
                <Users className="w-4 h-4 text-[var(--color-text-primary)]" />
                {t("home.feed.following")}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-[var(--color-text-primary)]" />
                {t("home.feed.community")}
              </>
            )}
          </h2>
          <Link
            href="/discussions"
            className="flex items-center gap-1 text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            {t("common.viewAll")}
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {feedEmpty ? (
          <div className="card p-8 space-y-4">
            <p className="text-sm text-[var(--color-text-secondary)] m-0">
              {t("home.feed.empty_following")}
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href="/discussions" className="btn btn-primary text-xs px-4 py-2">
                {t("home.feed.browse_discussions")}
              </Link>
              <Link href="/discover" className="btn btn-secondary text-xs px-4 py-2">
                {t("home.feed.discover_projects")}
              </Link>
            </div>
          </div>
        ) : feedPosts.length === 0 ? (
          <div className="card p-10 text-center text-[var(--color-text-muted)] text-sm">
            {t("home.feed.no_discussions")}
          </div>
        ) : (
          <div className="space-y-3">
            {feedPosts.map((post) => (
              <PostCard key={post.id} post={post} truncateBody={160} />
            ))}
          </div>
        )}
      </div>

      <div className="lg:col-span-5 space-y-8">
        {featured.length > 0 && (
          <AnimatedSection className="space-y-4" delayMs={80}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--color-text-primary)]" />
                <BlurText as="h2" className="text-base font-semibold text-[var(--color-text-primary)]">
                  {t("home.feed.featured_today")}
                </BlurText>
              </div>
              <Link href="/discover" className="text-xs text-[var(--color-text-secondary)] hover:underline shrink-0">
                {t("nav.discover")}
              </Link>
            </div>
            <div className="space-y-3">
              {featured.map((project) => (
                <ProjectCard key={project.id} project={project} featured />
              ))}
            </div>
          </AnimatedSection>
        )}

        <AnimatedSection className="space-y-4" delayMs={120}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[var(--color-text-secondary)]" />
              <BlurText as="h2" className="text-base font-semibold text-[var(--color-text-primary)]">
                {t("home.feed.project_gallery")}
              </BlurText>
            </div>
            <Link
              href="/discover"
              className="flex items-center gap-1 text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            >
                {t("common.explore")}
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {projects.length === 0 ? (
              <div className="card p-8 text-center text-[var(--color-text-muted)] text-sm">
                {t("home.feed.no_projects")}
              </div>
            ) : (
              projects.map((project) => <ProjectCard key={project.id} project={project} />)
            )}
          </div>
        </AnimatedSection>

        {teams.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[var(--color-text-primary)]" />
                <h2 className="text-base font-semibold text-[var(--color-text-primary)]">{t("home.feed.active_teams")}</h2>
              </div>
              <Link
                href="/teams"
                className="flex items-center gap-1 text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                {t("common.viewAll")}
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-3">
              {teams.map((team) => (
                <Link
                  key={team.id}
                  href={`/teams/${team.slug}`}
                  className="card p-4 flex items-start gap-3 transition-colors block"
                >
                  <Avatar tone="neutral" size="md" square initial={team.name.charAt(0)} alt={team.name} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-[var(--color-text-primary)] truncate">{team.name}</span>
                      <span className="tag tag-green shrink-0">
                        {team.memberCount} {team.memberCount !== 1 ? t("teams.membersPlural") : t("teams.memberSingular")}
                      </span>
                    </div>
                    {team.mission && (
                      <p className="text-xs text-[var(--color-text-muted)] line-clamp-1">{team.mission}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
