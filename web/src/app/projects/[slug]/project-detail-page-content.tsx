import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CollaborationIntentForm } from "@/components/collaboration-intent-form";
import { ProjectCollaborationOwnerPanel } from "@/components/project-collaboration-owner-panel";
import { ProjectTeamLinkForm } from "@/components/project-team-link-form";
import { ShareProjectButton } from "@/components/share-project-button";
import { ProjectBookmarkButton } from "@/components/project-bookmark-button";
import { getSessionUserFromCookie } from "@/lib/auth";
import {
  getCreatorProfileById,
  getProjectBySlug,
  getProjectEngagementSnapshot,
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
import { Avatar, Badge } from "@/components/ui";
import { getServerLanguage, getServerTranslator } from "@/lib/i18n";
import { formatLocalizedDate, formatRelativeTime } from "@/lib/formatting";

const PROJECT_HERO_INITIAL_CLASS =
  "w-24 h-24 md:w-32 md:h-32 rounded-[var(--radius-2xl)] bg-gradient-to-br from-[var(--color-primary-subtle)] to-[var(--color-accent-cyan-subtle)] flex items-center justify-center text-4xl font-bold text-[var(--color-primary-hover)] border border-[var(--color-border)]";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function ProjectDetailPageContent({ params }: Props) {
  const { slug } = await params;
  const [{ t }, language] = await Promise.all([getServerTranslator(), getServerLanguage()]);
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
  const [publicMilestones, relatedProjects, creatorCredit, engagementSnapshot] = await Promise.all([
    listPublicMilestonesForProject(project.id),
    listProjects({ tag: project.tags[0], page: 1, limit: 4 }),
    creatorProfile ? getContributionCredit(creatorProfile.userId) : Promise.resolve(null),
    getProjectEngagementSnapshot({ projectId: project.id, viewerUserId: session?.userId ?? null }),
  ]);

  const related = relatedProjects.items.filter((p) => p.id !== project.id).slice(0, 3);

  const STATUS_COLOR: Record<string, "violet" | "cyan" | "success" | "default"> = {
    idea: "violet",
    building: "cyan",
    launched: "success",
    paused: "default",
  };

  const STATUS_LABEL: Record<string, string> = {
    idea: t("project.status.idea", "Idea"),
    building: t("project.status.building", "Building"),
    launched: t("project.status.launched", "Launched"),
    paused: t("project.status.paused", "Paused"),
  };

  const activeCollabCount = approvedIntents.pagination.total;
  const primaryCollaborationAction = project.team
    ? {
        href: session ? `/work/team/${project.team.slug}` : `/login?redirect=${encodeURIComponent(`/work/team/${project.team.slug}`)}`,
        label: t("project.collaboration.apply_to_join", "Apply to join {team}").replace("{team}", project.team.name),
        description: t(
          "project.collaboration.team_join_description",
          "This project already runs inside a team. Join the team first, then participate in tasks and discussions."
        ),
      }
    : isProjectOwner
      ? {
          href: "/work/library",
          label: t("project.collaboration.start_team", "进入项目库"),
          description: t(
            "project.collaboration.start_team_description",
            "从项目库继续管理归属关系，并把项目接入正式工作区。"
          ),
        }
      : {
          href: session ? "#project-collaboration-intent" : `/login?redirect=${encodeURIComponent(`/p/${project.slug}`)}`,
          label: t("project.collaboration.join", "Join collaboration"),
          description: activeCollabCount > 0
            ? t(
                "project.collaboration.active_description",
                "There are already {count} active collaborators. Add your intent and the owner can route you into the right team."
              ).replace("{count}", String(activeCollabCount))
            : t(
                "project.collaboration.no_team_description",
                "No team is linked yet. Submit your intent to join or help start the first collaboration thread."
              ),
        };

  return (
    <main className="container pb-24 pt-6">

      {/* Back */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("project.back_to_discover", "Back to home")}
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
              <Badge variant={STATUS_COLOR[project.status] ?? "default"} pill mono size="sm">
                {STATUS_LABEL[project.status] ?? project.status}
              </Badge>
              {project.openSource && (
                <Badge variant="success" pill mono size="sm">
                  {t("project.open_source", "Open source")}
                </Badge>
              )}
              {project.license && (
                <Badge variant="default" pill mono size="sm">
                  {project.license}
                </Badge>
              )}
              {activeCollabCount > 0 && (
                <Badge variant="cyan" pill mono size="sm">
                  <Users className="w-2.5 h-2.5" />
                  {t("project.collaboration.active_count", "{count} collaborators").replace("{count}", String(activeCollabCount))}
                </Badge>
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
                {t("common.updated", "Updated")} {formatRelativeTime(project.updatedAt, language)}
              </span>
              {project.team && (
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <Link href={`/work/team/${project.team.slug}`} className="text-[var(--color-primary-hover)] hover:underline">
                    {project.team.name}
                  </Link>
                </span>
              )}
              {creatorProfile && (
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  {t("project.by_creator", "By")}{" "}
                  <Link href={`/u/${creatorProfile.slug}`} className="text-[var(--color-primary-hover)] hover:underline ml-0.5">
                    {creatorProfile.headline?.split(" ").slice(0, 3).join(" ") ?? t("project.creator_fallback", "Creator")}
                  </Link>
                </span>
              )}
            </div>

            <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)] m-0">
                    {t("project.collaboration.title", "Collaboration")}
                  </p>
                  <p className="text-sm font-medium text-[var(--color-text-primary)] m-0">
                    {primaryCollaborationAction.label}
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)] m-0 max-w-2xl">
                    {primaryCollaborationAction.description}
                  </p>
                </div>
                {primaryCollaborationAction.href.startsWith("#") ? (
                  <a
                    href={primaryCollaborationAction.href}
                    className="btn btn-primary text-sm px-4 py-2 inline-flex items-center gap-1.5"
                  >
                    <Users className="w-3.5 h-3.5" />
                    {primaryCollaborationAction.label}
                  </a>
                ) : (
                  <Link
                    href={primaryCollaborationAction.href}
                    className="btn btn-primary text-sm px-4 py-2 inline-flex items-center gap-1.5"
                  >
                    <Users className="w-3.5 h-3.5" />
                    {primaryCollaborationAction.label}
                  </Link>
                )}
              </div>
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
                  {t("project.live_demo", "Live demo")}
                </a>
              )}
              <ProjectBookmarkButton
                projectSlug={project.slug}
                initialBookmarked={engagementSnapshot.viewerHasBookmarked}
                initialCount={engagementSnapshot.bookmarkCount}
                loginHref={`/login?redirect=${encodeURIComponent(`/p/${project.slug}`)}`}
                isAuthenticated={Boolean(session)}
              />
              {project.repoUrl && (
                <a
                  href={project.repoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary text-sm px-4 py-2 flex items-center gap-1.5"
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  {t("project.repository", "Repository")}
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
                  {t("project.website", "Website")}
                </a>
              )}
              {canEditProject && (
                <Link
                  href={`/p/${encodeURIComponent(project.slug)}/edit`}
                  className="btn btn-secondary text-sm px-4 py-2 flex items-center gap-1.5"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  {t("project.edit", "Edit project")}
                </Link>
              )}
              <ShareProjectButton
                title={project.title}
                url={
                  typeof process.env.NEXT_PUBLIC_BASE_URL === "string" && process.env.NEXT_PUBLIC_BASE_URL
                    ? `${process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, "")}/p/${project.slug}`
                    : `/p/${project.slug}`
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
                    {t("project.tech_stack", "Tech stack")}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {project.techStack.map((tech) => (
                      <Link key={tech} href="/" className="hover:opacity-80 transition-opacity">
                        <Badge variant="cyan" pill mono size="sm">{tech}</Badge>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {project.tags && project.tags.length > 0 && (
                <div className={project.techStack?.length ? "mt-5 pt-5 border-t border-[var(--color-border-subtle)]" : ""}>
                  <div className="flex flex-wrap gap-2">
                    {project.tags.map((tag) => (
                      <Link key={tag} href="/" className="hover:opacity-80 transition-opacity">
                        <Badge variant="default" pill mono size="sm">#{tag}</Badge>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </section>
          ) : null}

          {/* Collaboration CTA */}
          <section id="project-collaboration-intent" className="card p-6 scroll-mt-20">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-[var(--color-primary-hover)]" />
              <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                {t("project.collaboration.section_title", "Join or recruit")}
              </h2>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] mb-5">
              {activeCollabCount > 0
                ? t("project.collaboration.section_active", "This project has {count} active collaborators. Submit your intent to join or recruit contributors.").replace("{count}", String(activeCollabCount))
                : t("project.collaboration.section_empty", "There are no active collaboration intents yet. Submit yours to join or recruit contributors.")}
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
                pitch: i.pitch,
                whyYou: i.whyYou,
                howCollab: i.howCollab,
              }))}
              teams={ownerTeams}
            />
          ) : null}

          {/* Approved collaborators */}
          {approvedIntents.items.length > 0 && (
            <section className="card p-6">
              <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[var(--color-warning)]" />
                {t("project.collaboration.active_title", "Active collaborators")}
              </h2>
              <div className="space-y-3">
                {approvedIntents.items.map((intent) => (
                  <div key={intent.id} className="p-4 rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-[var(--color-text-primary)]">
                        {intent.intentType === "join"
                          ? t("project.collaboration.intent_join", "Team member")
                          : t("project.collaboration.intent_recruit", "Recruiter")}
                      </span>
                      <Badge variant="success" pill mono size="sm">{intent.status}</Badge>
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
                {t("project.related_title", "Related projects")}
              </h2>
              <div className="space-y-2">
                {related.map((p) => (
                  <Link
                    key={p.id}
                    href={`/p/${p.slug}`}
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
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{t("project.creator_title", "Creator")}</h3>
              </div>
              <div className="flex items-start gap-3">
                <Avatar tone="neutral" size="lg" initial={creatorProfile.headline.charAt(0)} alt={creatorProfile.headline} />
                <div className="min-w-0">
                  <Link href={`/u/${creatorProfile.slug}`} className="text-sm font-medium text-[var(--color-text-primary)] hover:text-[var(--color-primary-hover)] transition-colors">
                    {creatorProfile.headline}
                  </Link>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5 line-clamp-2">{creatorProfile.bio}</p>
                  {creatorCredit && creatorCredit.score > 0 && (
                    <div className="flex items-center gap-1 mt-2">
                      <Zap className="w-3 h-3 text-[var(--color-warning)]" />
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {t("project.credit_score", "Credit score")}: <strong className="text-[var(--color-warning)]">{creatorCredit.score}</strong>
                      </span>
                    </div>
                  )}
                </div>
              </div>
              {creatorProfile.skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {creatorProfile.skills.slice(0, 4).map((s) => (
                    <Badge key={s} variant="default" pill mono size="sm">{s}</Badge>
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
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{t("project.roadmap_title", "Roadmap")}</h3>
              </div>
              <div className="space-y-4">
                {publicMilestones.map((ms) => (
                  <div key={ms.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-[var(--color-text-primary)]">{ms.title}</span>
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {ms.completed
                          ? t("project.roadmap_done", "Done")
                          : formatLocalizedDate(ms.targetDate, language, { month: "short", day: "numeric" })}
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

	          <aside className="card p-5">
	            <div className="flex items-center justify-between gap-3 mb-4">
	              <div>
	                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] m-0">{t("project.signals_title", "Recent collaboration signals")}</h3>
	                <p className="text-xs text-[var(--color-text-muted)] mt-1 mb-0">
	                  {t("project.bookmark_total", "{count} saves total").replace("{count}", String(engagementSnapshot.bookmarkCount))}
	                  {engagementSnapshot.recentBookmarkDelta > 0
                      ? ` · ${t("project.saves_this_week", "+{count} saves this week").replace("{count}", String(engagementSnapshot.recentBookmarkDelta))}`
                      : ""}
	                </p>
	              </div>
	              <Badge variant="cyan" pill mono size="sm">
                  {t("project.collaboration.intent_count", "{count} intents").replace("{count}", String(activeCollabCount))}
                </Badge>
	            </div>
	            <div className="space-y-4">
	              <div>
	                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)] mb-2">{t("project.recent_bookmarkers", "Recent bookmarkers")}</p>
	                {engagementSnapshot.recentBookmarkers.length > 0 ? (
	                  <div className="flex flex-wrap gap-2">
	                    {engagementSnapshot.recentBookmarkers.map((bookmark) => (
	                      <Badge key={`${bookmark.userId}-${bookmark.name}`} variant="default" pill mono size="sm">
	                        {bookmark.name}
	                      </Badge>
	                    ))}
	                  </div>
	                ) : (
	                  <p className="text-xs text-[var(--color-text-secondary)] m-0">{t("project.no_bookmarkers", "No one has bookmarked this project yet.")}</p>
	                )}
	              </div>
	              <div>
	                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)] mb-2">{t("project.recent_intents", "Recent collaboration intents")}</p>
	                {engagementSnapshot.recentCollaborationIntents.length > 0 ? (
	                  <div className="space-y-2">
	                    {engagementSnapshot.recentCollaborationIntents.map((intent) => (
	                      <div key={intent.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-3">
	                        <div className="flex items-center justify-between gap-2">
	                          <span className="text-xs font-medium text-[var(--color-text-primary)]">{intent.applicantName}</span>
	                          <Badge variant="default" pill mono size="sm">{intent.intentType}</Badge>
	                        </div>
	                        <p className="text-xs text-[var(--color-text-secondary)] mt-2 mb-0 line-clamp-2">{intent.message}</p>
	                      </div>
	                    ))}
	                  </div>
	                ) : (
	                  <p className="text-xs text-[var(--color-text-secondary)] m-0">{t("project.no_intents", "No collaboration intents yet.")}</p>
	                )}
	              </div>
	            </div>
	          </aside>

	          {/* MCP Agent Config */}
          <aside className="card p-5 bg-[var(--color-bg-elevated)]">
            <div className="flex items-center gap-2 mb-3 text-[var(--color-accent-cyan)]">
              <Terminal className="w-4 h-4" />
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{t("developers.agent_readable", "Agent readable")}</h3>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mb-3">
              {t("project.mcp_description", "This project is available via MCP v2 and can be queried from any AI agent with read access.")}
            </p>
            <pre className="code-block text-xs text-[var(--color-text-secondary)] overflow-x-auto">
              {JSON.stringify(mcpToolExample, null, 2)}
            </pre>
            <div className="mt-3 flex items-center gap-2">
              <a href="/api/v1/mcp/v2/manifest" target="_blank" rel="noreferrer" className="text-xs text-[var(--color-accent-cyan)] hover:underline">
                {t("developers.mcp_manifest", "MCP manifest")} →
              </a>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
