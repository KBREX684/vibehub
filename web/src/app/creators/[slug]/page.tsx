import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { getCreatorBySlug, listProjects, getCreatorGrowthStats } from "@/lib/repository";
import { ProjectCard } from "@/components/project-card";
import { User, Briefcase, Code2, Users, MessageSquare, Star, FolderGit2, Activity, ShieldCheck } from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function CreatorDetailPage({ params }: Props) {
  const { slug } = await params;
  const creator = await getCreatorBySlug(slug);
  if (!creator) {
    notFound();
  }

  const [
    { items: creatorProjects },
    stats
  ] = await Promise.all([
    listProjects({ creatorId: creator.id, page: 1, limit: 20 }),
    getCreatorGrowthStats(slug)
  ]);

  const prefMap: Record<string, string> = {
    open: "Open to Collaborate",
    invite_only: "Invite Only",
    closed: "Not Collaborating",
  };

  return (
    <>
      <SiteHeader />
      <main className="container pb-24 space-y-8 mt-6">
        
        {/* Bento Resume Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Hero Bento (Left) */}
          <article className="lg:col-span-8 relative p-8 md:p-12 rounded-[32px] bg-[rgba(255,255,255,0.85)] backdrop-blur-[24px] saturate-[150%] shadow-[0_8px_32px_-4px_rgba(0,0,0,0.04)] border border-white/60 overflow-hidden">
            {/* Decorative Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#81e6d9] rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4 opacity-30 pointer-events-none" />
            
            <div className="relative z-10">
              <div className="flex flex-col sm:flex-row sm:items-center gap-8 mb-10">
                <div className="w-28 h-28 rounded-[24px] bg-gradient-to-br from-[#f5ebd4] to-[#81e6d9] flex items-center justify-center shadow-[0_16px_48px_-8px_rgba(0,0,0,0.1)] shrink-0 border border-white/40">
                  <User className="w-12 h-12 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-4xl md:text-5xl font-semibold tracking-[-0.03em] text-[var(--color-text-primary)] m-0 leading-none">
                      {creator.slug}
                    </h1>
                    <ShieldCheck className="w-6 h-6 text-[var(--color-accent-apple)]" />
                  </div>
                  <p className="text-xl text-[var(--color-text-secondary)] font-medium m-0">
                    {creator.headline}
                  </p>
                </div>
              </div>

              <div className="p-6 rounded-[24px] bg-black/5 border border-black/5 mb-10">
                <p className="text-[1.05rem] text-[var(--color-text-secondary)] leading-[1.6] whitespace-pre-wrap m-0">
                  {creator.bio}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-4 m-0">
                    <Code2 className="w-4 h-4" /> Tech Stack
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {creator.skills.map((skill) => (
                      <span key={skill} className="text-[0.85rem] font-medium px-3 py-1.5 bg-white border border-black/5 text-[var(--color-text-primary)] rounded-[12px] shadow-sm">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-4 m-0">
                    <Users className="w-4 h-4" /> Collaboration
                  </h3>
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#81e6d9]/20 text-[#0d9488] rounded-[12px] font-medium">
                    <div className="w-2 h-2 rounded-full bg-[#0d9488] animate-pulse" />
                    {prefMap[creator.collaborationPreference] || creator.collaborationPreference}
                  </div>
                </div>
              </div>
            </div>
          </article>

          {/* Stats Bento (Right) */}
          {stats && (
            <aside className="lg:col-span-4 flex flex-col gap-6">
              <div className="p-8 rounded-[32px] bg-[#2d2d30] text-white shadow-[0_16px_48px_-8px_rgba(0,0,0,0.15)] flex-1 flex flex-col">
                <div className="flex items-center gap-2 mb-8 text-[#81e6d9]">
                  <Activity className="w-5 h-5" />
                  <h3 className="text-lg font-semibold tracking-tight m-0 text-white">Developer Stats</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-4 flex-1">
                  <div className="p-5 rounded-[20px] bg-black/40 border border-white/10 flex flex-col justify-center">
                    <FolderGit2 className="w-5 h-5 text-[#81e6d9] mb-3" />
                    <strong className="text-3xl font-mono font-bold text-white mb-1">{stats.projectCount}</strong>
                    <span className="text-[0.8rem] font-medium text-white/60">Projects</span>
                  </div>
                  <div className="p-5 rounded-[20px] bg-black/40 border border-white/10 flex flex-col justify-center">
                    <MessageSquare className="w-5 h-5 text-[#f5ebd4] mb-3" />
                    <strong className="text-3xl font-mono font-bold text-white mb-1">{stats.postCount}</strong>
                    <span className="text-[0.8rem] font-medium text-white/60">Discussions</span>
                  </div>
                  <div className="p-5 rounded-[20px] bg-black/40 border border-white/10 flex flex-col justify-center">
                    <Star className="w-5 h-5 text-[#f5ebd4] mb-3" />
                    <strong className="text-3xl font-mono font-bold text-white mb-1">{stats.featuredPostCount}</strong>
                    <span className="text-[0.8rem] font-medium text-white/60">Featured</span>
                  </div>
                  <div className="p-5 rounded-[20px] bg-black/40 border border-white/10 flex flex-col justify-center">
                    <Users className="w-5 h-5 text-[#81e6d9] mb-3" />
                    <strong className="text-3xl font-mono font-bold text-white mb-1">{stats.collaborationIntentCount}</strong>
                    <span className="text-[0.8rem] font-medium text-white/60">Intents</span>
                  </div>
                </div>
              </div>
            </aside>
          )}
        </div>

        {/* Projects Section */}
        <section className="pt-8">
          <div className="flex items-center gap-3 mb-8 px-4">
            <Briefcase className="w-6 h-6 text-[var(--color-text-tertiary)]" />
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)] m-0">
              Portfolio
            </h2>
            <span className="text-[0.85rem] font-bold px-3 py-1 bg-black/5 text-[var(--color-text-secondary)] rounded-[980px]">
              {creatorProjects.length}
            </span>
          </div>

          {creatorProjects.length === 0 ? (
            <div className="text-center py-24 rounded-[32px] bg-[rgba(255,255,255,0.5)] border border-white/60 shadow-sm">
              <Briefcase className="w-12 h-12 text-[var(--color-text-tertiary)] mx-auto mb-4 opacity-50" />
              <p className="text-[1.05rem] font-medium text-[var(--color-text-secondary)]">No projects published yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {creatorProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
