import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CollaborationIntentForm } from "@/components/collaboration-intent-form";
import { ProjectTeamLinkForm } from "@/components/project-team-link-form";
import { getSessionUserFromCookie } from "@/lib/auth";
import {
  getCreatorProfileById,
  getProjectBySlug,
  listProjectCollaborationIntents,
  listPublicMilestonesForProject,
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
} from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
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
  const publicMilestones = await listPublicMilestonesForProject(project.id);

  const STATUS_COLOR: Record<string, string> = {
    idea:     "tag-violet",
    building: "tag-blue",
    launched: "tag-green",
    paused:   "tag",
  };

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
                  unoptimized
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-[var(--radius-2xl)] bg-gradient-to-br from-[var(--color-primary-subtle)] to-[var(--color-accent-cyan-subtle)] flex items-center justify-center text-4xl font-bold text-[var(--color-primary-hover)] border border-[var(--color-border)]">
                {project.title.charAt(0)}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col gap-4 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`tag ${STATUS_COLOR[project.status] ?? "tag"} capitalize`}>
                {project.status}
              </span>
              {project.openSource && (
                <span className="tag tag-green">Open Source</span>
              )}
              {project.license && (
                <span className="tag">{project.license}</span>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
              {project.title}
            </h1>

            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed max-w-2xl">
              {project.oneLiner}
            </p>

            {/* Links */}
            <div className="flex flex-wrap gap-2">
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
            </div>

            {/* Quick stats */}
            {project.team && (
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                <span className="text-xs text-[var(--color-text-secondary)]">
                  Team:{" "}
                  <Link
                    href={`/teams/${project.team.slug}`}
                    className="text-[var(--color-primary-hover)] hover:underline"
                  >
                    {project.team.name}
                  </Link>
                </span>
              </div>
            )}
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
                unoptimized
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

          {/* About */}
          <section className="card p-6">
            <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-4">
              About the Project
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-wrap">
              {project.description}
            </p>

            {project.techStack?.length > 0 && (
              <div className="mt-5 pt-5 border-t border-[var(--color-border-subtle)]">
                <h3 className="flex items-center gap-2 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
                  <Code2 className="w-3.5 h-3.5" />
                  Tech Stack
                </h3>
                <div className="tag-row">
                  {project.techStack.map((tech) => (
                    <span key={tech} className="tag tag-blue">{tech}</span>
                  ))}
                </div>
              </div>
            )}

            {project.tags?.length > 0 && (
              <div className="mt-4">
                <div className="tag-row">
                  {project.tags.map((tag) => (
                    <span key={tag} className="tag">#{tag}</span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Collaboration */}
          <section className="card p-6">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-[var(--color-primary-hover)]" />
              <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                Collaboration
              </h2>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] mb-5">
              Submit your intent to join or recruit contributors for this project.
            </p>
            <CollaborationIntentForm projectSlug={project.slug} />
          </section>

          {/* Approved collaborators */}
          {approvedIntents.items.length > 0 && (
            <section className="card p-6">
              <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-4">
                Approved Collaborators
              </h2>
              <div className="space-y-3">
                {approvedIntents.items.map((intent) => (
                  <div key={intent.id} className="p-4 rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-[var(--color-text-primary)]">
                        {intent.intentType === "join" ? "Join Request" : "Recruitment"}
                      </span>
                      <span className="tag tag-green capitalize">{intent.status}</span>
                    </div>
                    <p className="text-xs text-[var(--color-text-secondary)]">{intent.message}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-[var(--color-text-muted)]">
                      <span>User: {intent.applicantId}</span>
                      {intent.contact && <span>Contact: {intent.contact}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-20">

          {/* Milestones */}
          {publicMilestones.length > 0 && (
            <aside className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-4 h-4 text-[var(--color-primary-hover)]" />
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Milestones</h3>
              </div>
              <div className="space-y-4">
                {publicMilestones.map((ms) => (
                  <div key={ms.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-[var(--color-text-primary)]">{ms.title}</span>
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {ms.completed
                          ? "Done"
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

          {/* MCP Config */}
          <aside className="card p-5 bg-[var(--color-bg-elevated)]">
            <div className="flex items-center gap-2 mb-3 text-[var(--color-accent-cyan)]">
              <Terminal className="w-4 h-4" />
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">MCP Agent Config</h3>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mb-3">
              Use this payload to interact via AI agents.
            </p>
            <pre className="code-block text-xs text-[var(--color-text-secondary)] overflow-x-auto">
              {JSON.stringify(mcpToolExample, null, 2)}
            </pre>
          </aside>
        </div>
      </div>
    </main>
  );
}
