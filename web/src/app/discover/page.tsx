import Link from "next/link";
import { ProjectCard } from "@/components/project-card";
import { DiscoverProjectFeed } from "@/components/discover-project-feed";
import { ProjectGalleryOrbitShell } from "@/components/visual/project-gallery-orbit-shell";
import { getSessionUserFromCookie } from "@/lib/auth";
import { formatLocalizedNumber } from "@/lib/formatting";
import { getServerTranslator } from "@/lib/i18n";
import { parsePagination } from "@/lib/pagination";
import { getProjectFilterFacets, listFeaturedProjects, listProjectFeed, listTeams } from "@/lib/repository";
import type { ProjectSortOrder, ProjectStatus } from "@/lib/types";
import { AnimatedSection } from "@/components/ui";
import { Search, Compass, X, SlidersHorizontal, Sparkles, Flame, Clock3, BrainCircuit } from "lucide-react";

function buildHref(
  base: Record<string, string | undefined>,
  overrides: Record<string, string | undefined>,
  classicPagination: boolean
): string {
  const next = { ...base, ...overrides };
  if (classicPagination) {
    next.pagination = "1";
  }
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(next)) {
    if (v) params.set(k, v);
  }
  const qs = params.toString();
  return qs ? `/discover?${qs}` : "/discover";
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DiscoverPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const { t, language } = await getServerTranslator();
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);

  const query      = get("query")?.trim();
  const tag        = get("tag")?.trim();
  const tech       = get("tech")?.trim();
  const team       = get("team")?.trim();
  const statusRaw  = get("status")?.trim();
  const sortRaw    = get("sort")?.trim();
  const pageRaw    = get("page");
  const limitRaw   = get("limit");
  const classicPagination = get("pagination") === "1";

  const qs = new URLSearchParams();
  if (query)     qs.set("query", query);
  if (tag)       qs.set("tag", tag);
  if (tech)      qs.set("tech", tech);
  if (team)      qs.set("team", team);
  if (statusRaw) qs.set("status", statusRaw);
  if (pageRaw)   qs.set("page", pageRaw);
  if (limitRaw)  qs.set("limit", limitRaw);
  if (classicPagination) qs.set("pagination", "1");

  const { page, limit } = parsePagination(qs);
  const status =
    statusRaw && ["idea", "building", "launched", "paused"].includes(statusRaw)
      ? (statusRaw as ProjectStatus)
      : undefined;
  const sort: ProjectSortOrder =
    sortRaw === "hot" || sortRaw === "featured" || sortRaw === "recommended" ? (sortRaw as ProjectSortOrder) : "latest";
  const session = await getSessionUserFromCookie();
  const statuses: { value: ProjectStatus; label: string }[] = [
    { value: "idea", label: t("project.status.idea", "Idea") },
    { value: "building", label: t("project.status.building", "Building") },
    { value: "launched", label: t("project.status.launched", "Launched") },
    { value: "paused", label: t("project.status.paused", "Paused") },
  ];

  const [{ items, pagination }, facets, teamsPage, featuredToday] = await Promise.all([
    listProjectFeed({ query, tag, tech, status, team, viewerUserId: session?.userId, sort, page, limit }),
    getProjectFilterFacets(),
    listTeams({ page: 1, limit: 100 }),
    listFeaturedProjects(),
  ]);
  const featuredOrbitItems = featuredToday.map((project) => ({
    id: project.id,
    slug: project.slug,
    title: project.title,
    imageUrl: project.screenshots[0] || project.logoUrl,
  }));

  const baseFilters: Record<string, string | undefined> = {
    query, tag, tech, team,
    status: statusRaw,
    sort,
    limit: String(limit),
  };

  const TABS: Array<{ sort: ProjectSortOrder; label: string; icon: typeof Clock3 }> = [
    { sort: "latest", label: t("discover.tab_latest", "Latest"), icon: Clock3 },
    { sort: "hot", label: t("discover.tab_hot", "Weekly Hot"), icon: Flame },
    { sort: "featured", label: t("discover.tab_featured", "Editorial Picks"), icon: Sparkles },
    { sort: "recommended", label: t("discover.tab_recommended", "Recommended"), icon: BrainCircuit },
  ];

  const selectCls =
    "input-base appearance-none cursor-pointer";

  const hasFilters = !!(query || tag || tech || team || statusRaw);
  const totalLabel = formatLocalizedNumber(pagination.total, language);
  const currentPageLabel = formatLocalizedNumber(pagination.page, language);
  const totalPagesLabel = formatLocalizedNumber(pagination.totalPages, language);
  const resultSummary =
    pagination.total === 1
      ? t("discover.results_summary_one", "{count} project found").replace("{count}", totalLabel)
      : t("discover.results_summary_many", "{count} projects found").replace("{count}", totalLabel);

  return (
    <main className="container pb-24 space-y-8 pt-8">

      {/* Page header */}
      <section className="page-hero flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-[var(--color-border)] animate-fade-in-up">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-[var(--radius-xl)] bg-[var(--color-accent-cyan-subtle)] flex items-center justify-center text-[var(--color-accent-cyan)]">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)] mb-0.5">
              {t("discover.title", "Discover Projects")}
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {t("discover.subtitle", "Explore AI-native tools, agents, and open-source products.")}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/p/new" className="btn btn-primary text-sm px-5 py-2 inline-flex">
            {t("discover.new_project", "New project")}
          </Link>
          {hasFilters && (
            <Link href="/discover" className="btn btn-ghost text-sm flex items-center gap-1.5 text-[var(--color-error)]">
              <X className="w-4 h-4" />
              {t("discover.clear_filters", "Clear filters")}
            </Link>
          )}
        </div>
      </section>

      {featuredToday.length > 0 && (
        <AnimatedSection className="space-y-4" delayMs={80}>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[var(--color-featured)]" />
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] m-0">
              {t("discover.featured_today", "Featured today")}
            </h2>
            <span className="text-xs text-[var(--color-text-muted)]">
              {t("discover.featured_note", "Editorial picks — same rail as the home page")}
            </span>
          </div>
          <ProjectGalleryOrbitShell ariaLabel={t("discover.featured_orbit_aria", "Featured projects orbit")} items={featuredOrbitItems} />
        </AnimatedSection>
      )}

      <section className="flex flex-wrap items-center gap-2">
        {TABS.map(({ sort: value, label, icon: Icon }) => (
          <Link
            key={value}
            href={buildHref(baseFilters, { sort: value, page: undefined }, classicPagination)}
            scroll={false}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[var(--radius-pill)] text-xs border transition-colors ${
              sort === value
                ? "bg-[var(--color-bg-elevated)] border-[var(--color-border-strong)] text-[var(--color-text-primary)]"
                : "bg-[var(--color-bg-canvas)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </Link>
        ))}
      </section>

      {sort === "hot" && (
        <div className="card p-4 text-sm text-[var(--color-text-secondary)]">
          {t(
            "discover.hot_hint",
            "Hot projects rank by saves, collaboration intents, recent updates, creator credit, and editorial picks."
          )}
        </div>
      )}

      {sort === "recommended" && !session && (
        <div className="card p-4 text-sm text-[var(--color-text-secondary)]">
          {t(
            "discover.recommended_hint",
            "Recommended ranking becomes personalized after sign-in. Anonymous access falls back to a generic relevance order."
          )}
        </div>
      )}

      {/* Filter bar */}
      <form
        className="card p-5"
        method="get"
        action="/discover"
      >
        <input type="hidden" name="limit" value={String(limit)} />
        {classicPagination && <input type="hidden" name="pagination" value="1" />}

        <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-[var(--color-text-primary)]">
          <SlidersHorizontal className="w-4 h-4 text-[var(--color-primary-hover)]" />
          {t("discover.filters_title", "Filters")}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">{t("discover.filter_search", "Search")}</span>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                className="input-base pl-8"
                type="search"
                name="query"
                placeholder={t("discover.search_placeholder", "Keywords...")}
                defaultValue={query ?? ""}
                autoComplete="off"
              />
            </div>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">{t("discover.filter_tag", "Tag")}</span>
            <select className={selectCls} name="tag" defaultValue={tag ?? ""}>
              <option value="">{t("discover.all_tags", "All Tags")}</option>
              {facets.tags.map((t) => (
                <option key={t} value={t}>#{t}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">{t("discover.filter_tech", "Tech Stack")}</span>
            <select className={selectCls} name="tech" defaultValue={tech ?? ""}>
              <option value="">{t("discover.all_tech", "All Tech")}</option>
              {facets.techStack.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">{t("discover.filter_stage", "Stage")}</span>
            <select className={selectCls} name="status" defaultValue={statusRaw ?? ""}>
              <option value="">{t("discover.all_stages", "All Stages")}</option>
              {statuses.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">{t("discover.filter_team", "Team")}</span>
            <select className={selectCls} name="team" defaultValue={team ?? ""}>
              <option value="">{t("discover.all_teams", "All Teams")}</option>
              {teamsPage.items.map((t) => (
                <option key={t.slug} value={t.slug}>{t.name}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[var(--color-border-subtle)]">
          <button
            type="submit"
            className="btn btn-primary text-sm px-5 py-2"
          >
            {t("discover.apply_filters", "Apply Filters")}
          </button>
          <Link
            href="/discover"
            className="btn btn-ghost text-sm px-4 py-2"
          >
            <X className="w-3.5 h-3.5" />
            {t("discover.reset_filters", "Reset")}
          </Link>
        </div>
      </form>

      {/* Results header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
          {resultSummary}
        </h2>
        <span className="text-xs text-[var(--color-text-muted)]">
          {t("discover.page_summary", "Page {current} / {total}")
            .replace("{current}", currentPageLabel)
            .replace("{total}", totalPagesLabel)}
          {!classicPagination && ` · ${t("discover.infinite_scroll", "Infinite scroll")}`}
        </span>
      </div>

      {/* Results */}
      {items.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="w-12 h-12 rounded-[var(--radius-xl)] bg-[var(--color-bg-elevated)] flex items-center justify-center mx-auto mb-4">
            <Search className="w-6 h-6 text-[var(--color-text-muted)]" />
          </div>
          <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-2">
            {t("discover.empty_title", "No projects match")}
          </h3>
          <p className="text-sm text-[var(--color-text-secondary)] mb-4">
            {t("discover.empty_description", "Try adjusting your filters or search terms.")}
          </p>
          <Link href="/discover" className="btn btn-secondary text-sm px-5 py-2 inline-flex">
            {t("discover.empty_cta", "Clear all filters")}
          </Link>
        </div>
      ) : classicPagination ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-grid">
            {items.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <nav className="flex justify-center gap-2 mt-8" aria-label={t("discover.pagination_aria", "Pagination")}>
              {pagination.page > 1 ? (
                <Link
                  className="btn btn-secondary text-sm px-5 py-2"
                  href={buildHref(baseFilters, { page: String(pagination.page - 1) }, true)}
                >
                  {t("common.previous", "Previous")}
                </Link>
              ) : (
                <span className="btn btn-secondary text-sm px-5 py-2 text-[var(--color-disabled-text)] border-[var(--color-disabled-border)] bg-[var(--color-disabled-bg)] cursor-not-allowed">
                  {t("common.previous", "Previous")}
                </span>
              )}
              <span className="btn btn-ghost text-sm px-4 py-2 text-[var(--color-text-muted)]">
                {currentPageLabel} / {totalPagesLabel}
              </span>
              {pagination.page < pagination.totalPages ? (
                <Link
                  className="btn btn-secondary text-sm px-5 py-2"
                  href={buildHref(baseFilters, { page: String(pagination.page + 1) }, true)}
                >
                  {t("common.next", "Next")}
                </Link>
              ) : (
                <span className="btn btn-secondary text-sm px-5 py-2 text-[var(--color-disabled-text)] border-[var(--color-disabled-border)] bg-[var(--color-disabled-bg)] cursor-not-allowed">
                  {t("common.next", "Next")}
                </span>
              )}
            </nav>
          )}
        </>
      ) : (
        <DiscoverProjectFeed
          filters={{
            query,
            tag,
            tech,
            team,
            status: statusRaw,
            sort,
            limit,
          }}
          initialItems={items}
          initialPagination={{
            total: pagination.total,
            totalPages: pagination.totalPages,
            page: pagination.page,
            limit: pagination.limit,
          }}
          paginationModeHref={buildHref(baseFilters, { page: "1", pagination: "1" }, false)}
        />
      )}
    </main>
  );
}
