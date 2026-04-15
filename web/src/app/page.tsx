import Link from "next/link";
import { listProjects, listTeams } from "@/lib/repository";
import { SearchBar } from "@/components/search-bar";
import { HomeFeedSection } from "@/components/home-feed-section";
import { getSessionUserFromCookie } from "@/lib/auth";
import {
  Zap,
  LayoutGrid,
  MessageSquare,
  Users,
  ArrowRight,
  Code2,
  Cpu,
  Activity,
} from "lucide-react";

export default async function HomePage() {
  const session = await getSessionUserFromCookie();
  const [{ items: projects }, { items: teams }] = await Promise.all([
    listProjects({ page: 1, limit: 6 }),
    listTeams({ page: 1, limit: 3 }),
  ]);

  return (
    <main className="container pb-24 space-y-16">

      {/* ── Hero (anchor for footer About link) ─────────────────────────────── */}
      <section id="about" className="pt-16 pb-12 text-center animate-fade-in-up scroll-mt-24">
        <div className="inline-flex items-center gap-2 px-3 py-1 border border-[var(--color-border)] text-xs font-mono text-[var(--color-text-secondary)] mb-8">
          <Zap className="w-3.5 h-3.5" />
          <span>[v1.0.0] Developer community for shipping together</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-[-0.04em] leading-[1.05] mb-6">
          <span className="text-[var(--color-text-primary)]">Build projects,</span>
          <br />
          <span className="text-[var(--color-text-secondary)]">find teammates, ship together.</span>
        </h1>

        <p className="text-base md:text-lg text-[var(--color-text-secondary)] max-w-xl mx-auto leading-relaxed mb-10">
          Discover developer projects, join active collaborations, form small
          teams, and move work forward in one place. VibeHub is built for
          builders who want to ship with other builders.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
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
        <div className="max-w-xl mx-auto">
          <SearchBar />
        </div>
      </section>

      {/* ── Platform Stats ───────────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[var(--color-border)] border border-[var(--color-border)] animate-fade-in-up delay-100">
        {[
          { icon: LayoutGrid, label: "Active Projects", value: projects.length },
          { icon: MessageSquare, label: "Discussions", value: "Live" },
          { icon: Users, label: "Active Teams", value: teams.length },
          { icon: Cpu, label: "Developer API + MCP", value: "Live" },
        ].map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="bg-[var(--color-bg-canvas)] p-6 text-center hover:bg-[var(--color-bg-surface)] transition-colors"
          >
            <div className="w-10 h-10 flex items-center justify-center mx-auto mb-3 text-[var(--color-text-secondary)]">
              <Icon className="w-5 h-5" />
            </div>
            <div className="text-2xl font-mono font-bold text-[var(--color-text-primary)] mb-1">{value}</div>
            <div className="text-xs text-[var(--color-text-muted)] font-medium uppercase tracking-wider">{label}</div>
          </div>
        ))}
      </section>

      {/* ── Platform Value Props ─────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in-up delay-200">
        {[
          {
            icon: Code2,
            title: "Project Discovery",
            desc: "Browse real developer projects, open-source tools, and active build logs that are looking for attention or help.",
          },
          {
            icon: Users,
            title: "Small-Team Delivery",
            desc: "Create a team, review join requests, manage tasks and milestones, and keep delivery moving with less friction.",
          },
          {
            icon: Activity,
            title: "Active Community",
            desc: "Share ideas, get feedback, and turn discussion into projects, collaboration intent, and actual work shipped.",
          },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="card p-6">
            <div className="w-8 h-8 flex items-center justify-center mb-4 text-[var(--color-text-primary)] border border-[var(--color-border)] rounded-[var(--radius-sm)]">
              <Icon className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">{title}</h3>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">{desc}</p>
          </div>
        ))}
      </section>

      {/* ── Feed + featured + gallery (S2) ───────────────────────────────────── */}
      <HomeFeedSection session={session} projects={projects} teams={teams} />

      {/* ── Flywheel: Community → Project → Team delivery ────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            step: "01",
            title: "Discuss & Share",
            desc: "Share ideas, publish updates, and collect the signal that helps projects improve.",
            href: "/discussions",
            ctaLabel: "Browse Discussions",
          },
          {
            step: "02",
            title: "Showcase Projects",
            desc: "Turn ideas into project pages that other developers can discover, follow, and join.",
            href: "/discover",
            ctaLabel: "Explore Projects",
          },
          {
            step: "03",
            title: "Coordinate Delivery",
            desc: "Approve join requests, align around milestones, and ship as a focused small team.",
            href: "/teams",
            ctaLabel: "Find Teams",
          },
          {
            step: "04",
            title: "Developer Tools",
            desc: "Use API keys, OpenAPI, and MCP tools to integrate discovery and collaboration into your workflow.",
            href: "/developers",
            ctaLabel: "Open Developer Hub",
          },
        ].map(({ step, title, desc, href, ctaLabel }) => (
          <div key={step} className="card p-5 space-y-3 flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-mono text-[var(--color-text-primary)]">{step}</span>
              <div className="flex-1 h-px bg-[var(--color-border)]" />
            </div>
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</h3>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed flex-1">{desc}</p>
            <Link
              href={href}
              className="text-xs font-mono flex items-center gap-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              {ctaLabel}
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        ))}
      </section>

      {/* ── CTA Banner ───────────────────────────────────────────────────────── */}
      <section className="card p-10 text-center border-t-2 border-t-[var(--color-text-primary)]">
        <div className="relative z-10">
          <h2 className="text-2xl md:text-3xl font-bold text-[var(--color-text-primary)] mb-3">
            Ready to ship with other builders?
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)] mb-6 max-w-md mx-auto">
            Create your profile, publish a project, find collaborators, and
            move from idea to delivery inside one developer-first workflow.
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
