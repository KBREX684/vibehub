import Link from "next/link";
import { ProjectCard } from "@/components/project-card";
import { PostCard } from "@/components/post-card";
import { listPosts, listProjects, listFeaturedProjects, listTeams } from "@/lib/repository";
import { SearchBar } from "@/components/search-bar";
import {
  Zap,
  LayoutGrid,
  MessageSquare,
  Users,
  ArrowRight,
  Terminal,
  Code2,
  Cpu,
  Activity,
} from "lucide-react";

export default async function HomePage() {
  const [{ items: projects }, { items: posts }, featured, { items: teams }] =
    await Promise.all([
      listProjects({ page: 1, limit: 6 }),
      listPosts({ page: 1, limit: 6 }),
      listFeaturedProjects(),
      listTeams({ page: 1, limit: 3 }),
    ]);

  return (
    <main className="container pb-24 space-y-16">

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="page-hero pt-12 pb-10 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-[var(--radius-pill)] bg-[var(--color-primary-subtle)] border border-[rgba(59,130,246,0.2)] text-xs font-medium text-[var(--color-primary-hover)] mb-8 animate-fade-up">
          <Zap className="w-3.5 h-3.5" />
          <span>VibeHub 2.0 — Vibe Coding Agentic Network</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-[-0.04em] leading-[1.05] mb-6 animate-fade-up animate-delay-100">
          <span className="gradient-text">Where the future</span>
          <br />
          <span className="text-[var(--color-text-primary)]">of software is built.</span>
        </h1>

        <p className="text-base md:text-lg text-[var(--color-text-secondary)] max-w-xl mx-auto leading-relaxed mb-10 animate-fade-up animate-delay-200">
          Connect with elite developers, discover AI-native projects, and
          orchestrate open collaborations. The unified platform for modern
          Vibe Coding builders.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12 animate-fade-up animate-delay-300">
          <Link
            href="/discover"
            className="btn btn-primary px-6 py-2.5 text-sm font-semibold"
          >
            Explore Projects
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/discussions"
            className="btn btn-secondary px-6 py-2.5 text-sm font-semibold"
          >
            Join Discussions
          </Link>
        </div>

        {/* Search */}
        <div className="max-w-xl mx-auto animate-fade-up animate-delay-400">
          <SearchBar />
        </div>
      </section>

      {/* ── Platform Stats ───────────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: LayoutGrid, label: "Active Projects", value: projects.length, color: "var(--color-primary)" },
          { icon: MessageSquare, label: "Discussions",    value: posts.length,   color: "var(--color-accent-cyan)" },
          { icon: Users,        label: "Active Teams",   value: teams.length,   color: "var(--color-accent-violet)" },
          { icon: Cpu,          label: "MCP API v2",     value: "Live",         color: "var(--color-success)" },
        ].map(({ icon: Icon, label, value, color }, i) => (
          <div
            key={label}
            className={`card p-6 text-center animate-fade-up`}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div
              className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center mx-auto mb-3"
              style={{ background: `${color}18`, color }}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">{value}</div>
            <div className="text-xs text-[var(--color-text-muted)] font-medium">{label}</div>
          </div>
        ))}
      </section>

      {/* ── Platform Value Props ─────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            icon: Code2,
            color: "var(--color-primary)",
            title: "AI-Native Projects",
            titleZh: "AI 原生项目",
            desc: "Discover open-source tools, MCP servers, and vibe-coded agents built for the next generation of software.",
          },
          {
            icon: Users,
            color: "var(--color-accent-violet)",
            title: "Collaborative Teams",
            titleZh: "协作团队",
            desc: "Find and join teams building real products. Coordinate tasks, set milestones, and ship together.",
          },
          {
            icon: Activity,
            color: "var(--color-accent-cyan)",
            title: "Live Community",
            titleZh: "活跃社区",
            desc: "Engage in high-quality technical discussions. Share ideas, get feedback, and grow your reputation.",
          },
        ].map(({ icon: Icon, color, title, desc }) => (
          <div key={title} className="card p-6 group hover:-translate-y-0.5 transition-all duration-200">
            <div
              className="w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center mb-4"
              style={{ background: `${color}15`, color }}
            >
              <Icon className="w-4.5 h-4.5" />
            </div>
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">{title}</h3>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">{desc}</p>
          </div>
        ))}
      </section>

      {/* ── Main content grid ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* Left: Community Feed */}
        <div className="lg:col-span-7 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[var(--color-accent-cyan)]" />
              Community Feed
            </h2>
            <Link
              href="/discussions"
              className="flex items-center gap-1 text-xs font-medium text-[var(--color-primary-hover)] hover:text-[var(--color-accent-cyan)] transition-colors"
            >
              View all
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {posts.length === 0 ? (
              <div className="card p-10 text-center text-[var(--color-text-muted)] text-sm">
                No discussions yet. Be the first to start one!
              </div>
            ) : (
              posts.map((post) => (
                <PostCard key={post.id} post={post} truncateBody={160} />
              ))
            )}
          </div>
        </div>

        {/* Right: Featured + Projects + Teams */}
        <div className="lg:col-span-5 space-y-8">

          {/* Featured Today */}
          {featured.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[var(--color-featured)]" />
                <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Featured Today</h2>
              </div>
              <div className="space-y-3">
                {featured.map((project) => (
                  <ProjectCard key={project.id} project={project} featured />
                ))}
              </div>
            </div>
          )}

          {/* Project Gallery */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[var(--color-primary-hover)]" />
                <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Project Gallery</h2>
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
                projects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))
              )}
            </div>
          </div>

          {/* Active Teams */}
          {teams.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[var(--color-accent-violet)]" />
                  <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Active Teams</h2>
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
                        <span className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                          {team.name}
                        </span>
                        <span className="tag tag-green shrink-0">
                          {team.memberCount} members
                        </span>
                      </div>
                      {team.mission && (
                        <p className="text-xs text-[var(--color-text-muted)] line-clamp-1">
                          {team.mission}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Flywheel: Community → Project → Team → Enterprise ────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            step: "01",
            title: "Discuss & Share",
            desc: "Post ideas, get feedback, and build reputation in the community.",
            href: "/discussions",
            ctaLabel: "Browse Discussions",
            color: "var(--color-accent-cyan)",
          },
          {
            step: "02",
            title: "Showcase Projects",
            desc: "Publish your work and attract collaborators across the ecosystem.",
            href: "/discover",
            ctaLabel: "Explore Projects",
            color: "var(--color-primary-hover)",
          },
          {
            step: "03",
            title: "Form Teams",
            desc: "Coordinate with collaborators, track milestones, and ship faster.",
            href: "/teams",
            ctaLabel: "Find Teams",
            color: "var(--color-accent-violet)",
          },
          {
            step: "04",
            title: "Enterprise Intelligence",
            desc: "Organizations discover top talent and projects via the radar layer.",
            href: "/workspace/enterprise",
            ctaLabel: "Enterprise Workspace",
            color: "var(--color-enterprise)",
          },
        ].map(({ step, title, desc, href, ctaLabel, color }) => (
          <div key={step} className="card p-5 space-y-3 flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-mono" style={{ color }}>{step}</span>
              <div className="flex-1 h-px bg-[var(--color-border)]" />
            </div>
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</h3>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed flex-1">{desc}</p>
            <Link
              href={href}
              className="text-xs font-medium flex items-center gap-1 hover:underline"
              style={{ color }}
            >
              {ctaLabel}
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        ))}
      </section>

      {/* ── CTA Banner ───────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden card p-10 text-center">
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-primary-subtle)] via-transparent to-[var(--color-accent-cyan-subtle)] pointer-events-none" />
        <div className="relative z-10">
          <h2 className="text-2xl md:text-3xl font-bold text-[var(--color-text-primary)] mb-3">
            Ready to build the future?
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)] mb-6 max-w-md mx-auto">
            Join thousands of Vibe Coding developers already collaborating on
            VibeHub.
          </p>
          <a
            href="/api/v1/auth/github?redirect=/"
            className="btn btn-primary px-8 py-3 text-sm font-semibold"
          >
            Get Started Free
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>

    </main>
  );
}
