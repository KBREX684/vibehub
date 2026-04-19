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
import { CreatorTeamsSection } from "./creator-teams-section";
import {
  User,
  Briefcase,
  Code2,
  Users,
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
  open: "开放协作",
  invite_only: "仅接受邀请",
  closed: "暂不协作",
};

const COLLAB_PREF_ACCENT: Record<string, "success" | "warning" | "default"> = {
  open: "success",
  invite_only: "warning",
  closed: "default",
};

export async function CreatorDetailPageContent({ params }: Props) {
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
        eyebrow="公开主页"
        title={
          <span className="inline-flex items-center gap-2">
            <span>{creator.slug}</span>
            <ShieldCheck
              className="w-5 h-5 text-[var(--color-accent-apple)]"
              aria-label="已验证资料"
            />
          </span>
        }
        subtitle={creator.headline}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Bio + skills */}
        <div className="lg:col-span-8 space-y-6">
          <SectionCard
            title="简介"
            description="公开展示的个人资料会同步沉淀到这里。"
            icon={User}
          >
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-wrap m-0">
              {creator.bio}
            </p>
          </SectionCard>

          <SectionCard title="技术栈" icon={Code2}>
            {creator.skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {creator.skills.map((skill) => (
                  <TagPill key={skill} accent="default" mono size="md">
                    {skill}
                  </TagPill>
                ))}
              </div>
            ) : (
              <EmptyState title="暂未填写技术栈" />
            )}
          </SectionCard>

          <SectionCard title="协作状态" icon={Users}>
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
              <span>增长概览 · GET /api/v1/creators/{slug}/growth</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="项目" value={stats.projectCount} icon={FolderGit2} />
              <StatCard label="讨论" value={stats.postCount} icon={Activity} />
              <StatCard label="精选" value={stats.featuredPostCount} icon={Star} />
              <StatCard label="协作意向" value={stats.collaborationIntentCount} icon={Users} />
              <StatCard label="发出评论" value={stats.commentCount} icon={Activity} className="col-span-2" />
              <StatCard label="收到评论" value={stats.receivedCommentCount} icon={Activity} className="col-span-2" />
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
            项目作品
          </h2>
          <TagPill accent="default" mono size="sm">
            {creatorProjects.length}
          </TagPill>
        </div>

        {creatorProjects.length === 0 ? (
          <div className="card p-0">
            <EmptyState
              icon={Briefcase}
              title="暂未公开项目"
              description="当该创作者发布项目后，会在这里展示。"
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
      <CreatorTeamsSection userId={creator.userId} />
    </main>
  );
}
