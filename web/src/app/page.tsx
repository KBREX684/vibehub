import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { ProjectCard } from "@/components/project-card";
import { PostCard } from "@/components/post-card";
import { listPosts, listProjects, listFeaturedProjects } from "@/lib/repository";
import { SearchBar } from "@/components/search-bar";
import { Sparkles, LayoutGrid, MessageSquare, Code2 } from "lucide-react";

export default async function HomePage() {
  const [{ items: projects }, { items: posts }, featured] = await Promise.all([
    listProjects({ page: 1, limit: 6 }),
    listPosts({ page: 1, limit: 6 }),
    listFeaturedProjects(),
  ]);

  return (
    <>
      <SiteHeader />
      <main className="container pb-24 space-y-12">
        {/* Macro Bento Box Hero */}
        <section className="relative w-full rounded-[32px] bg-[rgba(255,255,255,0.85)] backdrop-blur-[24px] saturate-[150%] border border-[rgba(255,255,255,0.6)] shadow-[0_8px_32px_-4px_rgba(0,0,0,0.04),0_0_1px_0_rgba(0,0,0,0.08)] overflow-hidden mt-6">
          <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent pointer-events-none" />
          
          <div className="relative z-10 px-6 py-20 md:px-12 md:py-28 flex flex-col items-center text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[rgba(0,0,0,0.03)] border border-black/5 text-sm font-medium text-[var(--color-text-secondary)] mb-8">
              <Sparkles className="w-4 h-4 text-[var(--color-accent-warm-beige)]" />
              <span>VibeCoding Agentic Network</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-semibold tracking-[-0.03em] leading-[1.07] text-[var(--color-text-primary)] mb-6">
              Build the Future,<br />
              <span className="text-[var(--color-text-secondary)]">Together.</span>
            </h1>
            
            <p className="text-lg md:text-xl text-[var(--color-text-secondary)] leading-[1.47] max-w-2xl mb-12">
              The community square for developers. Discuss ideas, showcase projects, assemble teams, and connect directly with AI tools.
            </p>
            
            <div className="w-full max-w-2xl">
              <SearchBar />
            </div>
          </div>
        </section>

        {/* Metrics Mini-Bento Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="group relative p-8 rounded-[24px] bg-[rgba(255,255,255,0.85)] backdrop-blur-[24px] border border-[rgba(255,255,255,0.6)] shadow-[0_8px_32px_-4px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_48px_-8px_rgba(0,0,0,0.08)]">
            <div className="w-12 h-12 rounded-2xl bg-[#007aff]/10 flex items-center justify-center mb-6 text-[#007aff]">
              <LayoutGrid className="w-6 h-6" />
            </div>
            <div className="text-4xl font-semibold tracking-tight text-[var(--color-text-primary)] mb-2">{projects.length}</div>
            <div className="text-[var(--color-text-secondary)] font-medium">Active Projects</div>
          </div>
          
          <div className="group relative p-8 rounded-[24px] bg-[rgba(255,255,255,0.85)] backdrop-blur-[24px] border border-[rgba(255,255,255,0.6)] shadow-[0_8px_32px_-4px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_48px_-8px_rgba(0,0,0,0.08)]">
            <div className="w-12 h-12 rounded-2xl bg-[#f5ebd4]/10 flex items-center justify-center mb-6 text-[#f5ebd4]">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div className="text-4xl font-semibold tracking-tight text-[var(--color-text-primary)] mb-2">{posts.length}</div>
            <div className="text-[var(--color-text-secondary)] font-medium">Discussions</div>
          </div>
          
          <div className="group relative p-8 rounded-[24px] bg-[rgba(255,255,255,0.85)] backdrop-blur-[24px] border border-[rgba(255,255,255,0.6)] shadow-[0_8px_32px_-4px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_48px_-8px_rgba(0,0,0,0.08)]">
            <div className="w-12 h-12 rounded-2xl bg-[#81e6d9]/20 flex items-center justify-center mb-6 text-[#81e6d9]">
              <Code2 className="w-6 h-6" />
            </div>
            <div className="text-4xl font-semibold tracking-tight text-[var(--color-text-primary)] mb-2">v2</div>
            <div className="text-[var(--color-text-secondary)] font-medium">MCP API Version</div>
          </div>
        </section>

        {/* 3-Column Layout for Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Discussions (Feed) - 7 cols */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-2xl font-semibold tracking-tight">Community Feed</h2>
              <Link href="/discussions" className="text-sm font-medium text-[var(--color-accent-apple)] hover:underline">View all</Link>
            </div>
            <div className="flex flex-col gap-4">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          </div>

          {/* Right Column: Featured & Projects - 5 cols */}
          <div className="lg:col-span-5 space-y-10">
            {featured.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 px-2">
                  <Sparkles className="w-5 h-5 text-[var(--color-accent-warm-beige)]" />
                  <h2 className="text-xl font-semibold tracking-tight">Featured Today</h2>
                </div>
                <div className="flex flex-col gap-4">
                  {featured.map((project) => (
                    <ProjectCard key={project.id} project={project} featured />
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-xl font-semibold tracking-tight">Project Gallery</h2>
                <Link href="/discover" className="text-sm font-medium text-[var(--color-accent-apple)] hover:underline">Explore</Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                {projects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            </div>
          </div>
          
        </div>
      </main>
    </>
  );
}
