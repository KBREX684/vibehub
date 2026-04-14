import Link from "next/link";
import { ProjectCard } from "@/components/project-card";
import { parsePagination } from "@/lib/pagination";
import { getProjectFilterFacets, listProjects, listTeams } from "@/lib/repository";
import type { ProjectStatus } from "@/lib/types";
import { Search, Compass, X, SlidersHorizontal } from "lucide-react";

const STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: "idea",     label: "Idea" },
  { value: "building", label: "Building" },
  { value: "launched", label: "Launched" },
  { value: "paused",   label: "Paused" },
];

function buildHref(
  base: Record<string, string | undefined>,
  overrides: Record<string, string | undefined>
): string {
  const next = { ...base, ...overrides };
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
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);

  const query      = get("query")?.trim();
  const tag        = get("tag")?.trim();
  const tech       = get("tech")?.trim();
  const team       = get("team")?.trim();
  const statusRaw  = get("status")?.trim();
  const pageRaw    = get("page");
  const limitRaw   = get("limit");

  const qs = new URLSearchParams();
  if (query)     qs.set("query", query);
  if (tag)       qs.set("tag", tag);
  if (tech)      qs.set("tech", tech);
  if (team)      qs.set("team", team);
  if (statusRaw) qs.set("status", statusRaw);
  if (pageRaw)   qs.set("page", pageRaw);
  if (limitRaw)  qs.set("limit", limitRaw);

  const { page, limit } = parsePagination(qs);
  const status =
    statusRaw && ["idea", "building", "launched", "paused"].includes(statusRaw)
      ? (statusRaw as ProjectStatus)
      : undefined;

  const [{ items, pagination }, facets, teamsPage] = await Promise.all([
    listProjects({ query, tag, tech, status, team, page, limit }),
    getProjectFilterFacets(),
    listTeams({ page: 1, limit: 100 }),
  ]);

  const baseFilters: Record<string, string | undefined> = {
    query, tag, tech, team,
    status: statusRaw,
    limit: String(limit),
  };

  const selectCls =
    "input-base appearance-none cursor-pointer";

  const hasFilters = !!(query || tag || tech || team || statusRaw);

  return (
    <main className="container pb-24 space-y-8 pt-8">

      {/* Page header */}
      <section className="page-hero flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-[var(--radius-xl)] bg-[var(--color-accent-cyan-subtle)] flex items-center justify-center text-[var(--color-accent-cyan)]">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)] mb-0.5">
              Discover Projects
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Explore AI-native tools, agents, and open-source products.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/projects/new" className="btn btn-primary text-sm px-5 py-2 inline-flex">
            New project
          </Link>
          {hasFilters && (
            <Link href="/discover" className="btn btn-ghost text-sm flex items-center gap-1.5 text-[var(--color-error)]">
              <X className="w-4 h-4" />
              Clear filters
            </Link>
          )}
        </div>
      </section>

      {/* Filter bar */}
      <form
        className="card p-5"
        method="get"
        action="/discover"
      >
        <input type="hidden" name="limit" value={String(limit)} />

        <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-[var(--color-text-primary)]">
          <SlidersHorizontal className="w-4 h-4 text-[var(--color-primary-hover)]" />
          Filters
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">Search</span>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                className="input-base pl-8"
                type="search"
                name="query"
                placeholder="Keywords..."
                defaultValue={query ?? ""}
                autoComplete="off"
              />
            </div>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">Tag</span>
            <select className={selectCls} name="tag" defaultValue={tag ?? ""}>
              <option value="">All Tags</option>
              {facets.tags.map((t) => (
                <option key={t} value={t}>#{t}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">Tech Stack</span>
            <select className={selectCls} name="tech" defaultValue={tech ?? ""}>
              <option value="">All Tech</option>
              {facets.techStack.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">Stage</span>
            <select className={selectCls} name="status" defaultValue={statusRaw ?? ""}>
              <option value="">All Stages</option>
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">Team</span>
            <select className={selectCls} name="team" defaultValue={team ?? ""}>
              <option value="">All Teams</option>
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
            Apply Filters
          </button>
          <Link
            href="/discover"
            className="btn btn-ghost text-sm px-4 py-2"
          >
            <X className="w-3.5 h-3.5" />
            Reset
          </Link>
        </div>
      </form>

      {/* Results header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
          {pagination.total}{" "}
          <span className="text-[var(--color-text-muted)] font-normal">
            project{pagination.total !== 1 ? "s" : ""} found
          </span>
        </h2>
        <span className="text-xs text-[var(--color-text-muted)]">
          Page {pagination.page} / {pagination.totalPages}
        </span>
      </div>

      {/* Results grid */}
      {items.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="w-12 h-12 rounded-[var(--radius-xl)] bg-[var(--color-bg-elevated)] flex items-center justify-center mx-auto mb-4">
            <Search className="w-6 h-6 text-[var(--color-text-muted)]" />
          </div>
          <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-2">
            No projects match
          </h3>
          <p className="text-sm text-[var(--color-text-secondary)] mb-4">
            Try adjusting your filters or search terms.
          </p>
          <Link href="/discover" className="btn btn-secondary text-sm px-5 py-2 inline-flex">
            Clear all filters
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <nav className="flex justify-center gap-2 mt-8" aria-label="Pagination">
          {pagination.page > 1 ? (
            <Link
              className="btn btn-secondary text-sm px-5 py-2"
              href={buildHref(baseFilters, { page: String(pagination.page - 1) })}
            >
              Previous
            </Link>
          ) : (
            <span className="btn btn-secondary text-sm px-5 py-2 opacity-40 cursor-not-allowed">
              Previous
            </span>
          )}
          <span className="btn btn-ghost text-sm px-4 py-2 text-[var(--color-text-muted)]">
            {pagination.page} / {pagination.totalPages}
          </span>
          {pagination.page < pagination.totalPages ? (
            <Link
              className="btn btn-secondary text-sm px-5 py-2"
              href={buildHref(baseFilters, { page: String(pagination.page + 1) })}
            >
              Next
            </Link>
          ) : (
            <span className="btn btn-secondary text-sm px-5 py-2 opacity-40 cursor-not-allowed">
              Next
            </span>
          )}
        </nav>
      )}
    </main>
  );
}
