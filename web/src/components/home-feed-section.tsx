import Link from "next/link";
import { Users, Sparkles, ArrowRight, Terminal } from "lucide-react";
import { getFollowFeed, listFeaturedProjects, listPosts } from "@/lib/repository";
import type { Project, SessionUser, TeamSummary } from "@/lib/types";
import { PostCard } from "@/components/post-card";
import { ProjectCard } from "@/components/project-card";

interface Props {
  session: SessionUser | null;
  projects: Project[];
  teams: TeamSummary[];
}

export async function HomeFeedSection({ session, projects, teams }: Props) {
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
                <Users className="w-4 h-4 text-[var(--color-accent-cyan)]" />
                Following
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-[var(--color-accent-cyan)]" />
                Community feed
              </>
            )}
          </h2>
          <Link
            href="/discussions"
            className="flex items-center gap-1 text-xs font-medium text-[var(--color-primary-hover)] hover:text-[var(--color-accent-cyan)] transition-colors"
          >
            View all
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {feedEmpty ? (
          <div className="card p-8 space-y-4">
            <p className="text-sm text-[var(--color-text-secondary)] m-0">
              You are not following anyone yet, or people you follow have not posted recently. Follow creators from
              their profile, or jump into the latest discussions.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href="/discussions" className="btn btn-primary text-xs px-4 py-2">
                Browse discussions
              </Link>
              <Link href="/discover" className="btn btn-secondary text-xs px-4 py-2">
                Discover projects
              </Link>
            </div>
          </div>
        ) : feedPosts.length === 0 ? (
          <div className="card p-10 text-center text-[var(--color-text-muted)] text-sm">
            No discussions yet. Be the first to start one!
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
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--color-featured)]" />
                <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Featured today</h2>
              </div>
              <Link href="/discover" className="text-xs text-[var(--color-primary-hover)] hover:underline shrink-0">
                Discover
              </Link>
            </div>
            <div className="space-y-3">
              {featured.map((project) => (
                <ProjectCard key={project.id} project={project} featured />
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[var(--color-primary-hover)]" />
              <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Project gallery</h2>
            </div>
            <Link
              href="/discover"
              className="flex items-center gap-1 text-xs font-medium text-[var(--color-primary-hover)] hover:text-[var(--color-accent-cyan)] transition-colors"
            >
              Explore
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {projects.length === 0 ? (
              <div className="card p-8 text-center text-[var(--color-text-muted)] text-sm">
                No projects yet. Submit yours!
              </div>
            ) : (
              projects.map((project) => <ProjectCard key={project.id} project={project} />)
            )}
          </div>
        </div>

        {teams.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[var(--color-accent-violet)]" />
                <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Active teams</h2>
              </div>
              <Link
                href="/teams"
                className="flex items-center gap-1 text-xs font-medium text-[var(--color-primary-hover)] hover:text-[var(--color-accent-cyan)] transition-colors"
              >
                View all
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-3">
              {teams.map((team) => (
                <Link
                  key={team.id}
                  href={`/teams/${team.slug}`}
                  className="card p-4 flex items-start gap-3 hover:-translate-y-0.5 transition-all duration-200 block"
                >
                  <div className="w-9 h-9 rounded-[var(--radius-md)] bg-gradient-to-br from-[var(--color-accent-violet-subtle)] to-[var(--color-primary-subtle)] flex items-center justify-center text-sm font-bold text-[var(--color-accent-violet)] shrink-0">
                    {team.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-[var(--color-text-primary)] truncate">{team.name}</span>
                      <span className="tag tag-green shrink-0">
                        {team.memberCount} member{team.memberCount !== 1 ? "s" : ""}
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
