import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { ProjectCard } from "@/components/project-card";
import { parsePagination } from "@/lib/pagination";
import { getProjectFilterFacets, listProjects, listTeams } from "@/lib/repository";
import type { ProjectStatus } from "@/lib/types";
import { Search, SlidersHorizontal, X } from "lucide-react";

const STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: "idea", label: "构思" },
  { value: "building", label: "开发中" },
  { value: "launched", label: "已上线" },
  { value: "paused", label: "暂停" },
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

  return (
    <>
      <SiteHeader />
      <main className="container section">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-stone-900 mb-3">项目发现</h1>
          <p className="text-stone-500 max-w-2xl">
            探索社区中正在构建的有趣项目。按标签、技术栈与阶段筛选，寻找灵感或协作机会。
          </p>
        </div>

        <form className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm mb-10" method="get" action="/discover">
          <input type="hidden" name="limit" value={String(limit)} />
          
          <div className="flex items-center gap-2 mb-6 text-stone-900 font-semibold">
            <SlidersHorizontal className="w-5 h-5 text-amber-600" />
            筛选条件
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">关键词</span>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  className="w-full border border-stone-200 rounded-xl py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                  type="search"
                  name="query"
                  placeholder="搜索标题或描述"
                  defaultValue={query ?? ""}
                  autoComplete="off"
                />
              </div>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">标签</span>
              <select 
                className="w-full border border-stone-200 rounded-xl py-2.5 px-3 text-sm bg-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                name="tag" 
                defaultValue={tag ?? ""}
              >
                <option value="">全部标签</option>
                {facets.tags.map((t) => (
                  <option key={t} value={t}>#{t}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">技术栈</span>
              <select 
                className="w-full border border-stone-200 rounded-xl py-2.5 px-3 text-sm bg-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                name="tech" 
                defaultValue={tech ?? ""}
              >
                <option value="">全部技术</option>
                {facets.techStack.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">阶段</span>
              <select 
                className="w-full border border-stone-200 rounded-xl py-2.5 px-3 text-sm bg-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                name="status" 
                defaultValue={statusRaw ?? ""}
              >
                <option value="">所有阶段</option>
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">团队</span>
              <select 
                className="w-full border border-stone-200 rounded-xl py-2.5 px-3 text-sm bg-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                name="team" 
                defaultValue={team ?? ""}
              >
                <option value="">所有团队</option>
                {teamsPage.items.map((t) => (
                  <option key={t.slug} value={t.slug}>{t.name}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex items-center gap-3 mt-6 pt-6 border-t border-stone-100">
            <button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm">
              应用筛选
            </button>
            <Link 
              href="/discover" 
              className="flex items-center gap-1.5 text-stone-500 hover:text-stone-900 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              <X className="w-4 h-4" /> 清除条件
            </Link>
          </div>
        </form>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-stone-900">发现结果</h2>
          <p className="text-sm text-stone-500 font-medium">
            共 {pagination.total} 个项目 <span className="mx-2 text-stone-300">|</span> 第 {pagination.page} / {pagination.totalPages} 页
          </p>
        </div>

        {items.length === 0 ? (
          <div className="bg-white border border-dashed border-stone-200 rounded-3xl p-16 text-center">
            <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-6 h-6 text-stone-400" />
            </div>
            <h3 className="text-lg font-bold text-stone-900 mb-2">暂无匹配项目</h3>
            <p className="text-stone-500 max-w-md mx-auto">
              尝试放宽筛选条件，或使用不同的关键词。
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
          <nav className="flex justify-center gap-3 mt-12" aria-label="分页">
            {pagination.page > 1 ? (
              <Link
                className="px-5 py-2.5 border border-stone-200 rounded-xl text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors bg-white shadow-sm"
                href={buildDiscoverHref(baseFilters, { page: String(pagination.page - 1) })}
              >
                上一页
              </Link>
            ) : (
              <span className="px-5 py-2.5 border border-stone-100 rounded-xl text-sm font-medium text-stone-300 bg-stone-50 cursor-not-allowed">
                上一页
              </span>
            )}
            
            {pagination.page < pagination.totalPages ? (
              <Link
                className="px-5 py-2.5 border border-stone-200 rounded-xl text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors bg-white shadow-sm"
                href={buildDiscoverHref(baseFilters, { page: String(pagination.page + 1) })}
              >
                下一页
              </Link>
            ) : (
              <span className="px-5 py-2.5 border border-stone-100 rounded-xl text-sm font-medium text-stone-300 bg-stone-50 cursor-not-allowed">
                下一页
              </span>
            )}
          </nav>
        )}
      </main>
    </>
  );
}
