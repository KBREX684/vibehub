import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CollaborationIntentForm } from "@/components/collaboration-intent-form";
import { ProjectCollaborationOwnerPanel } from "@/components/project-collaboration-owner-panel";
import { ProjectTeamLinkForm } from "@/components/project-team-link-form";
import { ShareProjectButton } from "@/components/share-project-button";
import { getSessionUserFromCookie } from "@/lib/auth";
import {
  getCreatorProfileById,
  getProjectBySlug,
  listProjectCollaborationIntents,
  listPublicMilestonesForProject,
  listProjects,
  getContributionCredit,
  listOwnedTeamSummariesForUser,
} from "@/lib/repository";
import {
  ExternalLink,
  Globe,
  Code2,
  Terminal,
  Users,
  Target,
  CheckCircle2,
  ArrowLeft,
  GitBranch,
  TrendingUp,
  Zap,
  Trophy,
  Clock,
  BookOpen,
  Pencil,
} from "lucide-react";
import { ProjectReadmeSection } from "@/components/project-readme-section";
import { Avatar } from "@/components/ui";

const PROJECT_HERO_INITIAL_CLASS =
  "w-24 h-24 md:w-32 md:h-32 rounded-[var(--radius-2xl)] bg-gradient-to-br from-[var(--color-primary-subtle)] to-[var(--color-accent-cyan-subtle)] flex items-center justify-center text-4xl font-bold text-[var(--color-primary-hover)] border border-[var(--color-border)]";

interface Props {
  params: Promise<{ slug: string }>;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 7) return `${d} days ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

export default async function ProjectDetailPage({ params }: Props) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);

  if (!project) notFound();

  const mcpToolExample = {
    tool: "get_project_detail",
    input: { slug: project.slug },
  };

  const [approvedIntents, session] = await Promise.all([
    listProjectCollaborationIntents({ projectId: project.id, status: "approved", page: 1, limit: 8 }),
    getSessionUserFromCookie(),
  ]);

  const creatorProfile = await getCreatorProfileById(project.creatorId);
  const canLinkTeam = Boolean(session && creatorProfile && session.userId === creatorProfile.userId);
  const canEditProject = Boolean(session && creatorProfile && session.userId === creatorProfile.userId);
  const isProjectOwner = Boolean(session && creatorProfile && session.userId === creatorProfile.userId);
  const pendingOwnerIntents =
    isProjectOwner && session
      ? await listProjectCollaborationIntents({ projectId: project.id, status: "pending", page: 1, limit: 20 })
      : { items: [] };
  const ownerTeams =
    isProjectOwner && session ? await listOwnedTeamSummariesForUser(session.userId) : [];
  const [publicMilestones, relatedProjects, creatorCredit] = await Promise.all([
    listPublicMilestonesForProject(project.id),
    listProjects({ tag: project.tags[0], page: 1, limit: 4 }),
    creatorProfile ? getContributionCredit(creatorProfile.userId) : Promise.resolve(null),
  ]);

  const related = relatedProjects.items.filter((p) => p.id !== project.id).slice(0, 3);

  const STATUS_COLOR: Record<string, string> = {
    idea:     "tag-violet",
    building: "tag-blue",
    launched: "tag-green",
    paused:   "tag",
  };

  const STATUS_LABEL: Record<string, string> = {
    idea:     "💡 Idea",
    building: "🏗 Building",
    launched: "🚀 Launched",
    paused:   "⏸ Paused",
  };

  const activeCollabCount = approvedIntents.pagination.total;

  return (
    <main className="container pb-24 pt-6">

      {/* Back */}
      <Link
        href="/discover"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Discover
      </Link>

      {/* Hero */}
      <section className="card p-6 md:p-8 mb-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary-subtle)] via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row gap-8">
          {/* Logo */}
          <div className="shrink-0">
            {project.logoUrl ? (
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-[var(--radius-2xl)] overflow-hidden border border-[var(--color-border)]">
                <Image
                  src={project.logoUrl}
                  alt={`${project.title} logo`}
                  width={128}
                  height={128}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className={PROJECT_HERO_INITIAL_CLASS}>
                {project.title.charAt(0)}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col gap-4 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`tag ${STATUS_COLOR[project.status] ?? "tag"}`}>
                {STATUS_LABEL[project.status] ?? project.status}
              </span>
              {project.openSource && (
                <span className="tag tag-green">Open Source</span>
              )}
              {project.license && (
                <span className="tag">{project.license}</span>
              )}
              {activeCollabCount > 0 && (
                <span className="tag tag-cyan flex items-center gap-1">
                  <Users className="w-2.5 h-2.5" />
                  {activeCollabCount} collaborator{activeCollabCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
              {project.title}
            </h1>

            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed max-w-2xl">
              {project.oneLiner}
            </p>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--color-text-muted)]">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Updated {relativeTime(project.updatedAt)}
              </span>
              {project.team && (
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <Link href={`/teams/${project.team.slug}`} className="text-[var(--color-primary-hover)] hover:underline">
                    {project.team.name}
                  </Link>
                </span>
              )}
              {creatorProfile && (
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  By{" "}
                  <Link href={`/creators/${creatorProfile.slug}`} className="text-[var(--color-primary-hover)] hover:underline ml-0.5">
                    {creatorProfile.headline?.split(" ").slice(0, 3).join(" ") ?? "Creator"}
                  </Link>
                </span>
              )}
            </div>

            {/* Action links */}
            <div className="flex flex-wrap gap-2 mt-1">
              {project.demoUrl && (
                <a
                  href={project.demoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary text-sm px-4 py-2 flex items-center gap-1.5"
                >
                  <Globe className="w-3.5 h-3.5" />
                  Live Demo
                </a>
              )}
              {project.repoUrl && (
                <a
                  href={project.repoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary text-sm px-4 py-2 flex items-center gap-1.5"
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  Repository
                </a>
              )}
              {project.websiteUrl && (
                <a
                  href={project.websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-ghost text-sm px-4 py-2 flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Website
                </a>
              )}
              {canEditProject && (
                <Link
                  href={`/projects/${encodeURIComponent(project.slug)}/edit`}
                  className="btn btn-secondary text-sm px-4 py-2 flex items-center gap-1.5"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit project
                </Link>
              )}
              <ShareProjectButton
                title={project.title}
                url={
                  typeof process.env.NEXT_PUBLIC_BASE_URL === "string" && process.env.NEXT_PUBLIC_BASE_URL
                    ? `${process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, "")}/projects/${project.slug}`
                    : `/projects/${project.slug}`
                }
              />
            </div>
          </div>
        </div>
      </section>

      {/* Screenshots */}
      {project.screenshots?.length > 0 && (
        <div className="flex gap-4 overflow-x-auto pb-4 mb-8 hide-scrollbar">
          {project.screenshots.map((url, i) => (
            <div
              key={i}
              className="shrink-0 w-[80vw] md:w-[500px] h-[240px] rounded-[var(--radius-xl)] overflow-hidden bg-[var(--color-bg-elevated)] border border-[var(--color-border)]"
            >
              <Image
                src={url}
                alt={`Screenshot ${i + 1}`}
                width={800}
                height={400}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* Main */}
        <div className="lg:col-span-8 space-y-6">

          <ProjectReadmeSection description={project.description} readmeMarkdown={project.readmeMarkdown} />

          {(project.techStack?.length ?? 0) > 0 || (project.tags?.length ?? 0) > 0 ? (
            <section className="card p-6">
              {project.techStack && project.techStack.length > 0 && (
                <div>
                  <h3 className="flex items-center gap-2 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
                    <Code2 className="w-3.5 h-3.5" />
                    Tech Stack
                  </h3>
                  <div className="tag-row">
                    {project.techStack.map((tech) => (
                      <Link key={tech} href={`/discover?tech=${encodeURIComponent(tech)}`} className="tag tag-blue hover:opacity-80 transition-opacity">{tech}</Link>
                    ))}
                  </div>
                </div>
              )}

              {project.tags && project.tags.length > 0 && (
                <div className={project.techStack?.length ? "mt-5 pt-5 border-t border-[var(--color-border-subtle)]" : ""}>
                  <div className="tag-row">
                    {project.tags.map((tag) => (
                      <Link key={tag} href={`/discover?tag=${encodeURIComponent(tag)}`} className="tag hover:opacity-80 transition-opacity">#{tag}</Link>
                    ))}
                  </div>
                </div>
              )}
            </section>
          ) : null}

          {/* Collaboration CTA */}
          <section className="card p-6">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-[var(--color-primary-hover)]" />
              <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                Join or Recruit
              </h2>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] mb-5">
              {activeCollabCount > 0
                ? `This project has ${activeCollabCount} active collaborator${activeCollabCount !== 1 ? "s" : ""}. Submit your intent to join or recruit contributors.`
                : "Be the first to join this project or post a recruitment notice."}
            </p>
            <CollaborationIntentForm projectSlug={project.slug} />
          </section>

          {isProjectOwner && pendingOwnerIntents.items.length > 0 ? (
            <ProjectCollaborationOwnerPanel
              projectSlug={project.slug}
              intents={pendingOwnerIntents.items.map((i) => ({
                id: i.id,
                intentType: i.intentType,
                message: i.message,
              }))}
              teams={ownerTeams}
            />
          ) : null}

          {/* Approved collaborators */}
          {approvedIntents.items.length > 0 && (
            <section className="card p-6">
              <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[var(--color-warning)]" />
                Active Collaborators
              </h2>
              <div className="space-y-3">
                {approvedIntents.items.map((intent) => (
                  <div key={intent.id} className="p-4 rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-[var(--color-text-primary)]">
                        {intent.intentType === "join" ? "Team Member" : "Recruiter"}
                      </span>
                      <span className="tag tag-green capitalize">{intent.status}</span>
                    </div>
                    <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2">{intent.message}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Related projects */}
          {related.length > 0 && (
            <section className="card p-6">
              <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[var(--color-accent-cyan)]" />
                Related Projects
              </h2>
              <div className="space-y-2">
                {related.map((p) => (
                  <Link
                    key={p.id}
                    href={`/projects/${p.slug}`}
                    className="flex items-center justify-between p-3 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-elevated)] transition-colors group"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-primary-hover)] transition-colors truncate">
                        {p.title}
                      </div>
                      <div className="text-xs text-[var(--color-text-muted)] truncate">{p.oneLiner}</div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0 ml-3" />
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-20">

          {/* Creator card */}
          {creatorProfile && (
            <aside className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-4 h-4 text-[var(--color-primary-hover)]" />
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Creator</h3>
              </div>
              <div className="flex items-start gap-3">
                <Avatar tone="cyan" size="lg" initial={creatorProfile.headline.charAt(0)} alt={creatorProfile.headline} />
                <div className="min-w-0">
                  <Link href={`/creators/${creatorProfile.slug}`} className="text-sm font-medium text-[var(--color-text-primary)] hover:text-[var(--color-primary-hover)] transition-colors">
                    {creatorProfile.headline}
                  </Link>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5 line-clamp-2">{creatorProfile.bio}</p>
                  {creatorCredit && creatorCredit.score > 0 && (
                    <div className="flex items-center gap-1 mt-2">
                      <Zap className="w-3 h-3 text-[var(--color-warning)]" />
                      <span className="text-xs text-[var(--color-text-muted)]">
                        Credit score: <strong className="text-[var(--color-warning)]">{creatorCredit.score}</strong>
                      </span>
                    </div>
                  )}
                </div>
              </div>
              {creatorProfile.skills.length > 0 && (
                <div className="tag-row mt-3">
                  {creatorProfile.skills.slice(0, 4).map((s) => (
                    <span key={s} className="tag text-[10px]">{s}</span>
                  ))}
                </div>
              )}
            </aside>
          )}

          {/* Milestones */}
          {publicMilestones.length > 0 && (
            <aside className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-4 h-4 text-[var(--color-primary-hover)]" />
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Roadmap</h3>
              </div>
              <div className="space-y-4">
                {publicMilestones.map((ms) => (
                  <div key={ms.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-[var(--color-text-primary)]">{ms.title}</span>
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {ms.completed
                          ? "Done ✓"
                          : new Date(ms.targetDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    {ms.description && (
                      <p className="text-xs text-[var(--color-text-muted)] mb-1.5">{ms.description}</p>
                    )}
                    <div className="h-1.5 w-full bg-[var(--color-bg-elevated)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${ms.progress}%`,
                          background: ms.completed
                            ? "var(--color-success)"
                            : "var(--color-primary)",
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-[var(--color-text-muted)]">{ms.progress}%</span>
                      {ms.completed && <CheckCircle2 className="w-3 h-3 text-[var(--color-success)]" />}
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          )}

          <ProjectTeamLinkForm project={project} canEdit={canLinkTeam} />

          {/* MCP Agent Config */}
          <aside className="card p-5 bg-[var(--color-bg-elevated)]">
            <div className="flex items-center gap-2 mb-3 text-[var(--color-accent-cyan)]">
              <Terminal className="w-4 h-4" />
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Agent Queryable</h3>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mb-3">
              This project is available via MCP v2 — query it from any AI agent with read access.
            </p>
            <pre className="code-block text-xs text-[var(--color-text-secondary)] overflow-x-auto">
              {JSON.stringify(mcpToolExample, null, 2)}
            </pre>
            <div className="mt-3 flex items-center gap-2">
              <a href="/api/v1/mcp/v2/manifest" target="_blank" rel="noreferrer" className="text-xs text-[var(--color-accent-cyan)] hover:underline">
                View MCP manifest →
              </a>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
