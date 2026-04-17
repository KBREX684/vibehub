/**
 * v8 W2 — creator detail page migrated off the legacy "Apple Bento" palette.
 *
 * Previous layout hard-coded `bg-white`, `bg-black/5`, `bg-[#2d2d30]`,
 * `text-white` and bespoke 32/24 px radii inline. All of that lived outside
 * our design system and was the single biggest source of palette violations
 * on this repo. The new layout uses:
 *   - PageHeader: identity + headline + verify badge + skills
 *   - SectionCard: collaboration preference
 *   - StatCard grid: growth metrics (6 cards, sourced from
 *     /api/v1/creators/{slug}/growth)
 *   - EmptyState: empty portfolio
 *   - TagPill: skill chips
 *
 * Semantics (copy / data) preserved, only the presentation changes.
 */
import { notFound } from "next/navigation";
import {
  getCreatorBySlug,
  listProjects,
  getCreatorGrowthStats,
} from "@/lib/repository";
import { ProjectCard } from "@/components/project-card";
import { CreatorGrowthMixChart } from "@/components/creator-growth-sparkline";
import { CreatorPostsSection } from "./creator-posts-section";
import { CreatorTeamsSection } from "./creator-teams-section";
import {
  User,
  Briefcase,
  Code2,
  Users,
  MessageSquare,
  Star,
  FolderGit2,
  Activity,
  ShieldCheck,
} from "lucide-react";
import {
  EmptyState,
  PageHeader,
  SectionCard,
  StatCard,
  TagPill,
} from "@/components/ui";

interface Props {
  params: Promise<{ slug: string }>;
}

const COLLAB_PREF_LABELS: Record<string, string> = {
  open: "Open to Collaborate",
  invite_only: "Invite Only",
  closed: "Not Collaborating",
};

const COLLAB_PREF_ACCENT: Record<string, "success" | "warning" | "default"> = {
  open: "success",
  invite_only: "warning",
  closed: "default",
};

export default async function CreatorDetailPage({ params }: Props) {
  const { slug } = await params;
  const creator = await getCreatorBySlug(slug);
  if (!creator) {
    notFound();
  }

  const [{ items: creatorProjects }, stats] = await Promise.all([
    listProjects({ creatorId: creator.id, page: 1, limit: 20 }),
    getCreatorGrowthStats(slug),
  ]);

  const prefKey = creator.collaborationPreference;
  const prefLabel = COLLAB_PREF_LABELS[prefKey] ?? prefKey;
  const prefAccent = COLLAB_PREF_ACCENT[prefKey] ?? "default";

  return (
    <main className="container pb-24 pt-8 space-y-8">
      <PageHeader
        icon={User}
        eyebrow="Creator"
        title={
          <span className="inline-flex items-center gap-2">
            <span>{creator.slug}</span>
            <ShieldCheck
              className="w-5 h-5 text-[var(--color-accent-apple)]"
              aria-label="Verified profile"
            />
          </span>
        }
        subtitle={creator.headline}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Bio + skills */}
        <div className="lg:col-span-8 space-y-6">
          <SectionCard
            title="About"
            description="Auto-populated from the creator's profile."
            icon={User}
          >
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-wrap m-0">
              {creator.bio}
            </p>
          </SectionCard>

          <SectionCard title="Tech stack" icon={Code2}>
            {creator.skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {creator.skills.map((skill) => (
                  <TagPill key={skill} accent="default" mono size="md">
                    {skill}
                  </TagPill>
                ))}
              </div>
            ) : (
              <EmptyState title="No tech stack declared" />
            )}
          </SectionCard>

          <SectionCard title="Collaboration" icon={Users}>
            <div className="flex items-center gap-2">
              <TagPill accent={prefAccent}>
                <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />
                {prefLabel}
              </TagPill>
            </div>
          </SectionCard>
        </div>

        {/* Growth stats */}
        {stats ? (
          <aside className="lg:col-span-4 space-y-4">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.12em] text-[var(--color-text-tertiary)]">
              <Activity className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Growth · GET /api/v1/creators/{slug}/growth</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="Projects"
                value={stats.projectCount}
                icon={FolderGit2}
              />
              <StatCard
                label="Discussions"
                value={stats.postCount}
                icon={MessageSquare}
              />
              <StatCard
                label="Featured"
                value={stats.featuredPostCount}
                icon={Star}
              />
              <StatCard
                label="Intents"
                value={stats.collaborationIntentCount}
                icon={Users}
              />
              <StatCard
                label="Comments written"
                value={stats.commentCount}
                icon={MessageSquare}
                className="col-span-2"
              />
              <StatCard
                label="Comments received"
                value={stats.receivedCommentCount}
                icon={MessageSquare}
                className="col-span-2"
              />
            </div>
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4">
              <CreatorGrowthMixChart stats={stats} />
            </div>
          </aside>
        ) : null}
      </div>

      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <Briefcase className="w-5 h-5 text-[var(--color-text-tertiary)]" aria-hidden="true" />
          <h2 className="text-xl font-semibold tracking-tight text-[var(--color-text-primary)] m-0">
            Portfolio
          </h2>
          <TagPill accent="default" mono size="sm">
            {creatorProjects.length}
          </TagPill>
        </div>

        {creatorProjects.length === 0 ? (
          <div className="card p-0">
            <EmptyState
              icon={Briefcase}
              title="No projects published yet"
              description="When this creator ships a project, it will appear here."
              block
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {creatorProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </section>

      <CreatorPostsSection authorUserId={creator.userId} />
      <CreatorTeamsSection userId={creator.userId} />
    </main>
  );
}
