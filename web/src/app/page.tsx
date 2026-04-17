import Link from "next/link";
import { listProjects, listTeams } from "@/lib/repository";
import { SearchBar } from "@/components/search-bar";
import { HomeFeedSection } from "@/components/home-feed-section";
import { getSessionUserFromCookie } from "@/lib/auth";
import { getServerTranslator } from "@/lib/i18n";
import {
  ArrowRight,
  Code2,
  Users,
  Activity,
  FolderGit2,
  Rocket,
  Search,
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

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section id="about" className="pt-16 pb-8 text-center animate-fade-in-up scroll-mt-24">
        <h1 className="text-4xl md:text-6xl font-bold tracking-[-0.04em] leading-[1.08] mb-5">
          <span className="text-[var(--color-text-primary)]">{t("home.hero_line1")}</span>
          <br />
          <span className="text-[var(--color-text-secondary)]">{t("home.hero_line2")}</span>
        </h1>

        <p className="text-base md:text-lg text-[var(--color-text-secondary)] max-w-xl mx-auto leading-relaxed mb-8">
          {t("home.hero_description")}
        </p>

        {/* Primary pathways — high-value CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
          <Link
            href="/discover"
            className="btn btn-primary px-6 py-2.5 text-sm font-semibold"
          >
            <Search className="w-4 h-4" />
            {t("home.cta_discover")}
          </Link>
          <Link
            href="/projects/new"
            className="btn btn-secondary px-6 py-2.5 text-sm font-semibold"
          >
            <FolderGit2 className="w-4 h-4" />
            {t("home.cta_publish")}
          </Link>
          <Link
            href="/developers"
            className="btn btn-secondary px-6 py-2.5 text-sm font-semibold"
          >
            <Code2 className="w-4 h-4" />
            {t("home.cta_integrate")}
          </Link>
        </div>

        {/* Search */}
        <div className="max-w-xl mx-auto">
          <SearchBar />
        </div>
      </section>

      {/* ── Core Value Props — what you can do here ─────────────────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in-up delay-100">
        {[
          {
            icon: Code2,
            title: t("home.value.discovery.title"),
            desc: t("home.value.discovery.description"),
            href: "/discover",
            cta: t("home.value.discovery.cta"),
          },
          {
            icon: Users,
            title: t("home.value.delivery.title"),
            desc: t("home.value.delivery.description"),
            href: "/teams",
            cta: t("home.value.delivery.cta"),
          },
          {
            icon: Activity,
            title: t("home.value.community.title"),
            desc: t("home.value.community.description"),
            href: "/discussions",
            cta: t("home.value.community.cta"),
          },
        ].map(({ icon: Icon, title, desc, href, cta }) => (
          <Link key={title} href={href} className="card p-6 group flex flex-col">
            <div className="w-9 h-9 flex items-center justify-center mb-4 text-[var(--color-text-primary)] border border-[var(--color-border)] rounded-[var(--radius-md)]">
              <Icon className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">{title}</h3>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed flex-1">{desc}</p>
            <span className="mt-4 text-xs font-medium flex items-center gap-1 text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors">
              {cta}
              <ArrowRight className="w-3 h-3" />
            </span>
          </Link>
        ))}
      </section>

      {/* ── Feed + featured + gallery ───────────────────────────────────────── */}
      <HomeFeedSection session={session} projects={projects} teams={teams} />

      {/* ── How it works — Platform flywheel ────────────────────────────────── */}
      <section className="space-y-6 animate-fade-in-up delay-200">
        <div className="flex items-center gap-3">
          <Rocket className="w-5 h-5 text-[var(--color-text-secondary)]" />
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{t("home.how_it_works")}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
        </div>
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
