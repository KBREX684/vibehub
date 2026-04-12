import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { ProjectCard } from "@/components/project-card";
import { parsePagination } from "@/lib/pagination";
import { getProjectFilterFacets, listProjects } from "@/lib/repository";
import type { ProjectStatus } from "@/lib/types";

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
  const statusRaw = get("status")?.trim();
  const pageRaw = get("page");
  const limitRaw = get("limit");

  if (query) params.set("query", query);
  if (tag) params.set("tag", tag);
  if (tech) params.set("tech", tech);
  if (statusRaw) params.set("status", statusRaw);
  if (pageRaw) params.set("page", pageRaw);
  if (limitRaw) params.set("limit", limitRaw);

  const { page, limit } = parsePagination(params);
  const status =
    statusRaw && ["idea", "building", "launched", "paused"].includes(statusRaw)
      ? (statusRaw as ProjectStatus)
      : undefined;

  const [{ items, pagination }, facets] = await Promise.all([
    listProjects({ query, tag, tech, status, page, limit }),
    getProjectFilterFacets(),
  ]);

  const baseFilters: Record<string, string | undefined> = {
    query,
    tag,
    tech,
    status: statusRaw,
    limit: String(limit),
  };

  return (
    <>
      <SiteHeader />
      <main className="container section">
        <h1>项目发现</h1>
        <p className="muted">
          P2-4：面向运营与外部的只读项目雷达。按标签、技术栈与阶段筛选；链接带查询参数，便于分享与复盘。
        </p>

        <form className="discover-filters card" method="get" action="/discover">
          <input type="hidden" name="limit" value={String(limit)} />
          <div className="discover-filter-grid">
            <label className="discover-field">
              <span>关键词</span>
              <input
                type="search"
                name="query"
                placeholder="标题或描述"
                defaultValue={query ?? ""}
                autoComplete="off"
              />
            </label>
            <label className="discover-field">
              <span>标签</span>
              <select name="tag" defaultValue={tag ?? ""}>
                <option value="">全部</option>
                {facets.tags.map((t) => (
                  <option key={t} value={t}>
                    #{t}
                  </option>
                ))}
              </select>
            </label>
            <label className="discover-field">
              <span>技术栈</span>
              <select name="tech" defaultValue={tech ?? ""}>
                <option value="">全部</option>
                {facets.techStack.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="discover-field">
              <span>阶段</span>
              <select name="status" defaultValue={statusRaw ?? ""}>
                <option value="">全部</option>
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="discover-actions">
            <button type="submit" className="button">
              应用筛选
            </button>
            <Link href="/discover" className="button ghost">
              清除
            </Link>
          </div>
        </form>

        <p className="muted small">
          共 {pagination.total} 条 · 第 {pagination.page} / {pagination.totalPages} 页
        </p>

        {items.length === 0 ? (
          <article className="card">
            <h2>暂无匹配项目</h2>
            <p className="muted">
              可放宽筛选条件，或引导创作者补充标签与技术栈，便于运营侧检索。
            </p>
          </article>
        ) : (
          <div className="grid">
            {items.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}

        {pagination.totalPages > 1 && (
          <nav className="discover-pagination" aria-label="分页">
            {pagination.page > 1 ? (
              <Link
                className="button ghost"
                href={buildDiscoverHref(baseFilters, { page: String(pagination.page - 1) })}
              >
                上一页
              </Link>
            ) : (
              <span className="button ghost muted" aria-disabled>
                上一页
              </span>
            )}
            {pagination.page < pagination.totalPages ? (
              <Link
                className="button ghost"
                href={buildDiscoverHref(baseFilters, { page: String(pagination.page + 1) })}
              >
                下一页
              </Link>
            ) : (
              <span className="button ghost muted" aria-disabled>
                下一页
              </span>
            )}
          </nav>
        )}
      </main>
    </>
  );
}
