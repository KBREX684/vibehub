import Link from "next/link";
import { ProjectCard } from "@/components/project-card";
import { parsePagination } from "@/lib/pagination";
import { getProjectFilterFacets, listProjects, listTeams } from "@/lib/repository";
import type { ProjectStatus } from "@/lib/types";
import { Search, SlidersHorizontal, X, Compass } from "lucide-react";

const STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: "idea", label: "Idea" },
  { value: "building", label: "Building" },
  { value: "launched", label: "Launched" },
  { value: "paused", label: "Paused" },
];

function buildDiscoverHref(
  base: Record<string, string | undefined>,
  overrides: Record<string, string | undefined>
): string {
  const next = { ...base, ...overrides };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(next)) {
    if (value !== undefined && value !== "") {
      params.set(key, value);
    }
  }
  const qs = params.toString();
  return qs ? `/discover?${qs}` : "/discover";
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DiscoverPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const get = (key: string) => {
    const v = sp[key];
    return typeof v === "string" ? v : undefined;
  };

  const params = new URLSearchParams();
  const query = get("query")?.trim();
  const tag = get("tag")?.trim();
  const tech = get("tech")?.trim();
  const team = get("team")?.trim();
  const statusRaw = get("status")?.trim();
  const pageRaw = get("page");
  const limitRaw = get("limit");

  if (query) params.set("query", query);
  if (tag) params.set("tag", tag);
  if (tech) params.set("tech", tech);
  if (team) params.set("team", team);
  if (statusRaw) params.set("status", statusRaw);
  if (pageRaw) params.set("page", pageRaw);
  if (limitRaw) params.set("limit", limitRaw);

  const { page, limit } = parsePagination(params);
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
    query,
    tag,
    tech,
    team,
    status: statusRaw,
    limit: String(limit),
  };

  const selectClasses = "w-full appearance-none bg-black/5 border border-transparent rounded-[12px] px-4 py-2.5 text-[0.95rem] text-[var(--color-text-primary)] outline-none transition-all duration-300 focus:bg-white focus:border-[#81e6d9]/50 focus:shadow-[0_0_16px_rgba(129,230,217,0.3)] cursor-pointer";

  return (
    <>
      <main className="container pb-24 space-y-8 mt-6">
        
        {/* Header Bento */}
        <section className="p-8 md:p-12 rounded-[32px] bg-[rgba(255,255,255,0.85)] backdrop-blur-[24px] saturate-[150%] shadow-[0_8px_32px_-4px_rgba(0,0,0,0.04)] border border-white/60 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-[24px] bg-[#81e6d9]/20 flex items-center justify-center text-[#0d9488] shadow-sm">
              <Compass className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-semibold tracking-[-0.02em] text-[var(--color-text-primary)] m-0">
                Discover
              </h1>
              <p className="text-[1.05rem] text-[var(--color-text-secondary)] mt-1">
                Explore projects being built in the community.
              </p>
            </div>
          </div>
        </section>

        {/* Filter Bento */}
        <form className="p-8 rounded-[32px] bg-[rgba(255,255,255,0.85)] backdrop-blur-[24px] saturate-[150%] shadow-[0_8px_32px_-4px_rgba(0,0,0,0.04)] border border-white/60" method="get" action="/discover">
          <input type="hidden" name="limit" value={String(limit)} />
          
          <div className="flex items-center gap-2 mb-6 text-[1.05rem] font-semibold text-[var(--color-text-primary)]">
            <SlidersHorizontal className="w-5 h-5 text-[var(--color-accent-apple)]" />
            Filters
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-[0.85rem] font-medium text-[var(--color-text-secondary)]">Search</span>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
                <input
                  className="w-full bg-black/5 border border-transparent rounded-[12px] py-2.5 pl-9 pr-3 text-[0.95rem] text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] outline-none transition-all duration-300 focus:bg-white focus:border-[#81e6d9]/50 focus:shadow-[0_0_16px_rgba(129,230,217,0.3)]"
                  type="search"
                  name="query"
                  placeholder="Keywords..."
                  defaultValue={query ?? ""}
                  autoComplete="off"
                />
              </div>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-[0.85rem] font-medium text-[var(--color-text-secondary)]">Tag</span>
              <select className={selectClasses} name="tag" defaultValue={tag ?? ""}>
                <option value="">All Tags</option>
                {facets.tags.map((t) => (
                  <option key={t} value={t}>#{t}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-[0.85rem] font-medium text-[var(--color-text-secondary)]">Tech Stack</span>
              <select className={selectClasses} name="tech" defaultValue={tech ?? ""}>
                <option value="">All Tech</option>
                {facets.techStack.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-[0.85rem] font-medium text-[var(--color-text-secondary)]">Stage</span>
              <select className={selectClasses} name="status" defaultValue={statusRaw ?? ""}>
                <option value="">All Stages</option>
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-[0.85rem] font-medium text-[var(--color-text-secondary)]">Team</span>
              <select className={selectClasses} name="team" defaultValue={team ?? ""}>
                <option value="">All Teams</option>
                {teamsPage.items.map((t) => (
                  <option key={t.slug} value={t.slug}>{t.name}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex items-center gap-3 mt-8 pt-6 border-t border-black/5">
            <button type="submit" className="px-6 py-2.5 rounded-[12px] bg-[var(--color-accent-apple)] text-white text-[0.95rem] font-medium hover:bg-[#0062cc] transition-colors shadow-sm active:scale-[0.98]">
              Apply Filters
            </button>
            <Link 
              href="/discover" 
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-[12px] text-[0.95rem] font-medium text-[var(--color-text-secondary)] hover:bg-black/5 hover:text-[var(--color-text-primary)] transition-colors active:scale-[0.98]"
            >
              <X className="w-4 h-4" /> Clear
            </Link>
          </div>
        </form>

        <div className="flex items-center justify-between px-2">
          <h2 className="text-xl font-semibold tracking-tight text-[var(--color-text-primary)]">Results</h2>
          <p className="text-[0.85rem] font-medium text-[var(--color-text-secondary)]">
            {pagination.total} projects found <span className="mx-2 text-[var(--color-text-tertiary)]">|</span> Page {pagination.page} of {pagination.totalPages}
          </p>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-24 rounded-[32px] bg-[rgba(255,255,255,0.5)] border border-white/60 shadow-sm">
            <div className="w-16 h-16 bg-black/5 rounded-[20px] flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-[var(--color-text-tertiary)]" />
            </div>
            <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-2">No projects match your criteria</h3>
            <p className="text-[0.95rem] text-[var(--color-text-secondary)]">
              Try adjusting your filters or search terms.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}

        {pagination.totalPages > 1 && (
          <nav className="flex justify-center gap-3 mt-12" aria-label="Pagination">
            {pagination.page > 1 ? (
              <Link
                className="px-6 py-3 rounded-[16px] bg-white border border-black/5 shadow-sm text-[0.95rem] font-medium text-[var(--color-text-primary)] hover:bg-black/5 transition-colors active:scale-[0.98]"
                href={buildDiscoverHref(baseFilters, { page: String(pagination.page - 1) })}
              >
                Previous
              </Link>
            ) : (
              <span className="px-6 py-3 rounded-[16px] bg-black/5 text-[0.95rem] font-medium text-[var(--color-text-tertiary)] cursor-not-allowed">
                Previous
              </span>
            )}
            
            {pagination.page < pagination.totalPages ? (
              <Link
                className="px-6 py-3 rounded-[16px] bg-white border border-black/5 shadow-sm text-[0.95rem] font-medium text-[var(--color-text-primary)] hover:bg-black/5 transition-colors active:scale-[0.98]"
                href={buildDiscoverHref(baseFilters, { page: String(pagination.page + 1) })}
              >
                Next
              </Link>
            ) : (
              <span className="px-6 py-3 rounded-[16px] bg-black/5 text-[0.95rem] font-medium text-[var(--color-text-tertiary)] cursor-not-allowed">
                Next
              </span>
            )}
          </nav>
        )}
      </main>
    </>
  );
}
