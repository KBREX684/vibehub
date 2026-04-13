import Image from "next/image";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { CollaborationIntentForm } from "@/components/collaboration-intent-form";
import { ProjectTeamLinkForm } from "@/components/project-team-link-form";
import { getSessionUserFromCookie } from "@/lib/auth";
import { getCreatorProfileById, getProjectBySlug, listProjectCollaborationIntents, listPublicMilestonesForProject } from "@/lib/repository";
import { ExternalLink, Globe, Code2, Terminal, Users, Target, CheckCircle2 } from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ProjectDetailPage({ params }: Props) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  const mcpToolExample = {
    tool: "get_project_detail",
    input: { slug: project.slug },
  };

  const approvedIntents = await listProjectCollaborationIntents({
    projectId: project.id,
    status: "approved",
    page: 1,
    limit: 8,
  });

  const session = await getSessionUserFromCookie();
  const creatorProfile = await getCreatorProfileById(project.creatorId);
  const canLinkTeam = Boolean(session && creatorProfile && session.userId === creatorProfile.userId);
  const publicMilestones = await listPublicMilestonesForProject(project.id);

  return (
    <>
      <SiteHeader />
      <main className="container pb-24">
        
        {/* Immersive Hero Gallery */}
        <section className="relative w-full rounded-[32px] bg-[rgba(255,255,255,0.85)] backdrop-blur-[24px] saturate-[150%] shadow-[0_8px_32px_-4px_rgba(0,0,0,0.04)] overflow-hidden mb-8">
          <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent pointer-events-none" />
          
          <div className="relative z-10 px-8 py-16 md:px-16 md:py-20 flex flex-col md:flex-row gap-12 items-center md:items-start">
            {project.logoUrl ? (
              <div className="w-32 h-32 md:w-48 md:h-48 rounded-[32px] overflow-hidden bg-black/5 flex-shrink-0 shadow-[0_16px_48px_-8px_rgba(0,0,0,0.08)]">
                <Image
                  src={project.logoUrl}
                  alt={`${project.title} logo`}
                  width={192}
                  height={192}
                  unoptimized
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-32 h-32 md:w-48 md:h-48 rounded-[32px] bg-black/5 flex items-center justify-center flex-shrink-0 text-5xl font-bold text-[var(--color-text-tertiary)] shadow-[0_16px_48px_-8px_rgba(0,0,0,0.08)]">
                {project.title.charAt(0)}
              </div>
            )}
            
            <div className="flex flex-col items-center md:items-start text-center md:text-left flex-grow">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 rounded-[980px] bg-black/5 text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                  {project.status}
                </span>
                {(project.openSource || project.license) && (
                  <span className="px-3 py-1 rounded-[980px] bg-[#81e6d9]/20 text-[#0d9488] text-xs font-bold uppercase tracking-wider">
                    {project.openSource ? "Open Source" : project.license}
                  </span>
                )}
              </div>
              
              <h1 className="text-4xl md:text-6xl font-semibold tracking-[-0.03em] leading-[1.1] text-[var(--color-text-primary)] mb-4">
                {project.title}
              </h1>
              
              <p className="text-xl text-[var(--color-text-secondary)] leading-[1.47] max-w-2xl mb-8">
                {project.oneLiner}
              </p>
              
              <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                {project.demoUrl && (
                  <a href={project.demoUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-6 py-3 rounded-[980px] bg-[var(--color-accent-apple)] text-white font-medium hover:bg-[#0062cc] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_8px_24px_rgba(0,122,255,0.3)]">
                    <Globe className="w-4 h-4" /> Live Demo
                  </a>
                )}
                {project.repoUrl && (
                  <a href={project.repoUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-6 py-3 rounded-[980px] bg-black/5 text-[var(--color-text-primary)] font-medium hover:bg-black/10 transition-all hover:scale-[1.02] active:scale-[0.98]">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.2c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg> Repository
                  </a>
                )}
                {project.websiteUrl && (
                  <a href={project.websiteUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-6 py-3 rounded-[980px] bg-black/5 text-[var(--color-text-primary)] font-medium hover:bg-black/10 transition-all hover:scale-[1.02] active:scale-[0.98]">
                    <ExternalLink className="w-4 h-4" /> Website
                  </a>
                )}
              </div>
            </div>
          </div>

          {project.screenshots && project.screenshots.length > 0 && (
            <div className="px-8 pb-16 md:px-16">
              <div className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory hide-scrollbar">
                {project.screenshots.map((url, i) => (
                  <div key={`screenshot-${i}`} className="snap-center shrink-0 w-[85vw] md:w-[600px] h-[300px] md:h-[400px] rounded-[24px] overflow-hidden bg-black/5 shadow-[0_16px_48px_-8px_rgba(0,0,0,0.08)]">
                    <Image
                      src={url}
                      alt={`Screenshot ${i + 1}`}
                      width={800}
                      height={500}
                      unoptimized
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Two-Column Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Content Column */}
          <div className="lg:col-span-8 space-y-8">
            <section className="p-8 rounded-[32px] bg-[rgba(255,255,255,0.85)] backdrop-blur-[24px] saturate-[150%] shadow-[0_8px_32px_-4px_rgba(0,0,0,0.04)]">
              <h2 className="text-2xl font-semibold tracking-tight mb-6">About the Project</h2>
              <div className="prose prose-stone max-w-none text-[var(--color-text-secondary)] leading-[1.6]">
                <p className="text-[1.05rem] whitespace-pre-wrap">{project.description}</p>
              </div>
              
              <div className="mt-10 pt-8 border-t border-black/5">
                <h3 className="text-sm font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Code2 className="w-4 h-4" /> Tech Stack
                </h3>
                <div className="flex flex-wrap gap-2">
                  {project.techStack.map((tech) => (
                    <span key={`${project.id}-${tech}`} className="px-4 py-2 rounded-[12px] bg-black/5 text-[0.95rem] font-medium text-[var(--color-text-primary)]">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </section>

            <section className="p-8 rounded-[32px] bg-[rgba(255,255,255,0.85)] backdrop-blur-[24px] saturate-[150%] shadow-[0_8px_32px_-4px_rgba(0,0,0,0.04)]">
              <div className="flex items-center gap-3 mb-6">
                <Users className="w-6 h-6 text-[var(--color-accent-apple)]" />
                <h2 className="text-2xl font-semibold tracking-tight m-0">Collaboration Square</h2>
              </div>
              <p className="text-[var(--color-text-secondary)] mb-8">
                Submit your intent to collaborate on this project. Choose join/recruit and provide context.
              </p>
              <CollaborationIntentForm projectSlug={project.slug} />
            </section>

            {approvedIntents.items.length > 0 && (
              <section className="p-8 rounded-[32px] bg-[rgba(255,255,255,0.85)] backdrop-blur-[24px] saturate-[150%] shadow-[0_8px_32px_-4px_rgba(0,0,0,0.04)]">
                <h2 className="text-2xl font-semibold tracking-tight mb-6">Approved Collaborators</h2>
                <div className="grid gap-4">
                  {approvedIntents.items.map((intent) => (
                    <div key={intent.id} className="p-6 rounded-[20px] bg-black/5 border border-white/50">
                      <div className="flex items-center justify-between mb-3">
                        <strong className="text-[var(--color-text-primary)] font-semibold">
                          {intent.intentType === "join" ? "Join Request" : "Recruitment Notice"}
                        </strong>
                        <span className="px-3 py-1 rounded-[980px] bg-[#81e6d9]/20 text-[#0d9488] text-[10px] font-bold uppercase tracking-wider">
                          {intent.status}
                        </span>
                      </div>
                      <p className="text-[var(--color-text-secondary)] text-[0.95rem] mb-4">{intent.message}</p>
                      <div className="flex items-center gap-4 text-[0.85rem] text-[var(--color-text-tertiary)]">
                        <span>Applicant: {intent.applicantId}</span>
                        {intent.contact && <span>Contact: {intent.contact}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sticky Sidebar Column */}
          <div className="lg:col-span-4 space-y-8 lg:sticky lg:top-24">
            
            {publicMilestones.length > 0 && (
              <aside className="p-6 rounded-[32px] bg-[rgba(255,255,255,0.85)] backdrop-blur-[24px] saturate-[150%] shadow-[0_8px_32px_-4px_rgba(0,0,0,0.04)]">
                <div className="flex items-center gap-2 mb-6">
                  <Target className="w-5 h-5 text-[var(--color-accent-apple)]" />
                  <h3 className="text-xl font-semibold tracking-tight m-0">Milestones</h3>
                </div>
                <div className="space-y-6">
                  {publicMilestones.map((ms) => (
                    <div key={ms.id} className="relative">
                      <div className="flex items-center justify-between mb-2">
                        <strong className="text-[0.95rem] text-[var(--color-text-primary)]">{ms.title}</strong>
                        <span className="text-[11px] font-medium text-[var(--color-text-tertiary)]">
                          {ms.completed ? "Completed" : new Date(ms.targetDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                      {ms.description && <p className="text-[0.85rem] text-[var(--color-text-secondary)] mb-3">{ms.description}</p>}
                      
                      <div className="h-2 w-full bg-black/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500 ease-out"
                          style={{
                            width: `${ms.progress}%`,
                            backgroundColor: ms.completed ? "#34c759" : "var(--color-accent-apple)",
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[10px] font-bold text-[var(--color-text-tertiary)]">{ms.progress}%</span>
                        {ms.completed && <CheckCircle2 className="w-3.5 h-3.5 text-[#34c759]" />}
                      </div>
                    </div>
                  ))}
                </div>
              </aside>
            )}

            <ProjectTeamLinkForm project={project} canEdit={canLinkTeam} />

            <aside className="p-6 rounded-[32px] bg-[#2d2d30] text-white shadow-[0_16px_48px_-8px_rgba(0,0,0,0.15)]">
              <div className="flex items-center gap-2 mb-4 text-[#81e6d9]">
                <Terminal className="w-5 h-5" />
                <h3 className="text-lg font-semibold tracking-tight m-0 text-white">Agent Invocation</h3>
              </div>
              <p className="text-[0.85rem] text-white/60 mb-4">
                Use this MCP tool payload to interact with this project via AI agents.
              </p>
              <pre className="p-4 rounded-[16px] bg-black/40 text-[#f5ebd4] font-mono text-[0.8rem] overflow-x-auto border border-white/10">
                {JSON.stringify(mcpToolExample, null, 2)}
              </pre>
            </aside>
          </div>
          
        </div>
      </main>
    </>
  );
}
