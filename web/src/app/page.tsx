import Link from "next/link";
import { listProjects, listTeams } from "@/lib/repository";
import { SearchBar } from "@/components/search-bar";
import { HomeFeedSection } from "@/components/home-feed-section";
import { getSessionUserFromCookie } from "@/lib/auth";
import { getServerTranslator } from "@/lib/i18n";
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
  const { t } = await getServerTranslator();
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
          <span>{t("home.version_badge")}</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-[-0.04em] leading-[1.05] mb-6">
          <span className="text-[var(--color-text-primary)]">{t("home.hero_line1")}</span>
          <br />
          <span className="text-[var(--color-text-secondary)]">{t("home.hero_line2")}</span>
        </h1>

        <p className="text-base md:text-lg text-[var(--color-text-secondary)] max-w-xl mx-auto leading-relaxed mb-10">
          {t("home.hero_description")}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
          <Link
            href="/discover"
            className="btn btn-primary px-6 py-2.5 text-sm font-semibold"
          >
            {t("home.explore_projects")}
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/discussions"
            className="btn btn-secondary px-6 py-2.5 text-sm font-semibold"
          >
            {t("home.join_discussions")}
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
          { icon: LayoutGrid, label: t("home.stats.active_projects"), value: projects.length },
          { icon: MessageSquare, label: t("home.stats.discussions"), value: t("common.live") },
          { icon: Users, label: t("home.stats.active_teams"), value: teams.length },
          { icon: Cpu, label: t("home.stats.developer_tools"), value: t("common.live") },
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
            title: t("home.value.discovery.title"),
            desc: t("home.value.discovery.description"),
          },
          {
            icon: Users,
            title: t("home.value.delivery.title"),
            desc: t("home.value.delivery.description"),
          },
          {
            icon: Activity,
            title: t("home.value.community.title"),
            desc: t("home.value.community.description"),
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
            title: t("home.steps.discuss.title"),
            desc: t("home.steps.discuss.description"),
            href: "/discussions",
            ctaLabel: t("home.steps.discuss.cta"),
          },
          {
            step: "02",
            title: t("home.steps.showcase.title"),
            desc: t("home.steps.showcase.description"),
            href: "/discover",
            ctaLabel: t("home.steps.showcase.cta"),
          },
          {
            step: "03",
            title: t("home.steps.coordinate.title"),
            desc: t("home.steps.coordinate.description"),
            href: "/teams",
            ctaLabel: t("home.steps.coordinate.cta"),
          },
          {
            step: "04",
            title: t("home.steps.tools.title"),
            desc: t("home.steps.tools.description"),
            href: "/developers",
            ctaLabel: t("home.steps.tools.cta"),
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
            {t("home.cta.title")}
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)] mb-6 max-w-md mx-auto">
            {t("home.cta.description")}
          </p>
          <Link href="/signup" className="btn btn-primary px-8 py-3 text-sm font-semibold">
            {t("home.cta.button")}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

    </main>
  );
}
