import Link from "next/link";
import { Users, Sparkles, ArrowRight, Terminal } from "lucide-react";
import { getFollowFeed, listFeaturedProjects, listPosts } from "@/lib/repository";
import type { Project, SessionUser, TeamSummary } from "@/lib/types";
import { PostCard } from "@/components/post-card";
import { ProjectCard } from "@/components/project-card";
import { AnimatedSection, Avatar, TagPill } from "@/components/ui";
import { ProjectGalleryOrbitShell } from "@/components/visual/project-gallery-orbit-shell";
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
  const featuredOrbitItems = (featured.length > 0 ? featured : projects).map((project) => ({
    id: project.id,
    slug: project.slug,
    title: project.title,
    imageUrl: project.screenshots[0] || project.logoUrl,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <div className="lg:col-span-7 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
            {session ? (
              <>
                <Users className="w-4 h-4 text-[var(--color-text-primary)]" />
                {t("home.feed.following", "关注动态")}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-[var(--color-text-primary)]" />
                {t("home.feed.community", "社区动态")}
              </>
            )}
          </h2>
          <Link
            href="/discover"
            className="flex items-center gap-1 text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            {t("common.viewAll", "查看全部")}
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {feedEmpty ? (
          <div className="card p-8 space-y-4">
            <p className="text-sm text-[var(--color-text-secondary)] m-0">
              {t("home.feed.empty_following", "你还没有关注任何人，或你关注的人最近没有发帖。")}
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href="/discover" className="btn btn-primary text-xs px-4 py-2">
                {t("home.feed.browse_discussions", "浏览讨论")}
              </Link>
              <Link href="/discover" className="btn btn-secondary text-xs px-4 py-2">
                {t("home.feed.discover_projects", "发现项目")}
              </Link>
            </div>
          </div>
        ) : feedPosts.length === 0 ? (
          <div className="card p-10 text-center text-[var(--color-text-muted)] text-sm">
            {t("home.feed.empty_discussions", "还没有讨论。来发起第一条吧！")}
          </div>
        ) : (
          <div className="space-y-3">
            {feedPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>

      <div className="lg:col-span-5 space-y-8">
        {featured.length > 0 && (
          <AnimatedSection className="space-y-4" delayMs={80} data-testid="home-project-orbit-section">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--color-text-primary)]" />
                <h2 className="text-base font-semibold text-[var(--color-text-primary)] m-0">
                  {t("home.feed.featured_today", "今日精选")}
                </h2>
              </div>
              <Link href="/discover" className="text-xs text-[var(--color-text-secondary)] hover:underline shrink-0">
                {t("nav.discover")}
              </Link>
            </div>
            <ProjectGalleryOrbitShell
              ariaLabel={t("home.feed.project_orbit_aria", "项目预览环带")}
              items={featuredOrbitItems}
            />
          </AnimatedSection>
        )}

        <AnimatedSection className="space-y-4" delayMs={120} data-testid="home-project-gallery-section">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[var(--color-text-secondary)]" />
              <h2 className="text-base font-semibold text-[var(--color-text-primary)] m-0">
                {t("home.feed.project_gallery", "项目画廊")}
              </h2>
            </div>
            <Link
              href="/discover"
              className="flex items-center gap-1 text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              {t("common.explore", "探索")}
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {projects.length === 0 ? (
              <div className="card p-8 text-center text-[var(--color-text-muted)] text-sm">
                {t("home.feed.no_projects", "还没有项目。提交你的第一个项目吧！")}
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
                <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                  {t("home.feed.active_teams", "活跃团队")}
                </h2>
              </div>
              <Link
                href="/discover"
                className="flex items-center gap-1 text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                {t("common.viewAll", "查看全部")}
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-3">
              {teams.map((team) => (
                <Link
                  key={team.id}
                  href={`/work/team/${team.slug}`}
                  className="card p-4 flex items-start gap-3 transition-colors block"
                >
                  <Avatar tone="neutral" size="md" square initial={team.name.charAt(0)} alt={team.name} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-[var(--color-text-primary)] truncate">{team.name}</span>
                      <TagPill accent="success" mono size="sm" className="shrink-0">
                        {t("team.member_count", "{count} members").replace("{count}", String(team.memberCount))}
                      </TagPill>
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
