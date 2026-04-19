import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CheckSquare,
  Eye,
  FilePlus2,
  Globe,
  Lock,
  Search,
  Square,
  Upload,
} from "lucide-react";
import { getSessionUserFromCookie } from "@/lib/auth";
import { listWorkLibraryItems } from "@/lib/work-console";
import { getServerLanguage } from "@/lib/i18n";
import { formatRelativeTime } from "@/lib/formatting";
import { EmptyState, TagPill } from "@/components/ui";

interface Props {
  searchParams?: Promise<{ status?: string; query?: string }>;
}

const TABS = [
  { label: "全部", value: "default" },
  { label: "草稿", value: "draft" },
  { label: "已公开", value: "public" },
  { label: "私密", value: "private" },
  { label: "开源", value: "open-source" },
  { label: "已归档", value: "archived" },
];

function buildTabHref(status?: string, query?: string) {
  const params = new URLSearchParams();
  if (status && status !== "default") params.set("status", status);
  if (query) params.set("query", query);
  const qs = params.toString();
  return qs ? `/work/library?${qs}` : "/work/library";
}

function visibilityMeta(visibility?: "draft" | "public" | "private", openSource?: boolean) {
  if (openSource) {
    return { label: "开源", icon: Globe, accent: "success" as const };
  }
  if (visibility === "public") {
    return { label: "公开", icon: Eye, accent: "default" as const };
  }
  if (visibility === "private") {
    return { label: "私密", icon: Lock, accent: "warning" as const };
  }
  return { label: "草稿", icon: FilePlus2, accent: "default" as const };
}

export default async function WorkLibraryPage({ searchParams }: Props) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    redirect("/login?redirect=/work/library");
  }

  const sp = (await searchParams) ?? {};
  const status = sp.status as "draft" | "public" | "private" | "open-source" | "archived" | undefined;
  const query = typeof sp.query === "string" ? sp.query.trim() : undefined;
  const [items, language] = await Promise.all([
    listWorkLibraryItems({ userId: session.userId, status, query }),
    getServerLanguage(),
  ]);

  return (
    <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-bg-surface)]">
      <section className="border-b border-[var(--color-border)] px-4 py-5 md:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
              Work Console
            </div>
            <div>
              <h1 className="m-0 text-xl font-semibold tracking-tight text-[var(--color-text-primary)]">项目库</h1>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                管理你拥有或参与协作的项目，并把它们统一接入工作区主面。
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn btn-secondary text-sm px-4 py-2 inline-flex items-center gap-2" disabled>
              <Upload className="h-4 w-4" />
              导入项目
            </button>
            <Link href="/p/new" className="btn btn-primary text-sm px-4 py-2 inline-flex items-center gap-2">
              <FilePlus2 className="h-4 w-4" />
              新建项目
            </Link>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <form action="/work/library" className="relative max-w-full xl:w-[24rem]">
            {status ? <input type="hidden" name="status" value={status} /> : null}
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
            <input
              type="search"
              name="query"
              defaultValue={query ?? ""}
              placeholder="搜索项目、标签、技术栈"
              className="input-base h-10 w-full pl-9"
            />
          </form>

          <div className="flex flex-wrap items-center gap-2">
            {TABS.map((tab) => {
              const active = (status ?? "default") === tab.value;
              return (
                <Link
                  key={tab.value}
                  href={buildTabHref(tab.value === "default" ? undefined : tab.value, query)}
                  className={[
                    "inline-flex items-center justify-center whitespace-nowrap border-b-2 px-1 py-2 text-sm transition-colors",
                    active
                      ? "border-[var(--color-primary)] text-[var(--color-text-primary)]"
                      : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
                  ].join(" ")}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {items.length === 0 ? (
        <div className="px-6 py-10">
          <EmptyState
            title="当前视图下还没有项目"
            description="调整筛选或搜索条件，或者先创建一个项目来填充你的项目库。"
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <caption className="sr-only">项目库</caption>
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-bg-canvas)]/60 text-left text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
              <tr>
                <th className="w-[44px] px-4 py-3">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded border border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[var(--color-text-tertiary)]">
                    <Square className="h-3.5 w-3.5" />
                  </span>
                </th>
                <th className="px-4 py-3">名称</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3">可见性</th>
                <th className="px-4 py-3">绑定工作区</th>
                <th className="px-4 py-3">最近更新</th>
                <th className="px-4 py-3">协作意向</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-subtle)]">
              {items.map((row) => {
                const visibility = visibilityMeta(row.visibility, row.openSource);
                const VisibilityIcon = visibility.icon;
                return (
                  <tr key={row.id} className="bg-[var(--color-bg-surface)] transition-colors hover:bg-[var(--color-bg-elevated)]">
                    <td className="px-4 py-4">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded border border-[var(--color-border)] bg-[var(--color-bg-canvas)] text-[var(--color-text-tertiary)]">
                        <CheckSquare className="h-3.5 w-3.5 opacity-40" />
                      </span>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="flex min-w-[16rem] items-start gap-3">
                        <div className="mt-0.5 h-9 w-9 shrink-0 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-canvas)]" />
                        <div className="min-w-0">
                          <Link
                            href={`/p/${encodeURIComponent(row.slug)}`}
                            className="block truncate text-sm font-semibold text-[var(--color-text-primary)] hover:underline"
                          >
                            {row.title}
                          </Link>
                          <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                            {row.oneLiner}
                          </div>
                          <div className="mt-2 text-[11px] font-mono text-[var(--color-text-tertiary)]">{row.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <TagPill mono size="sm" accent={row.status === "launched" ? "success" : row.status === "building" ? "warning" : "default"}>
                        {row.status === "launched"
                          ? "已上线"
                          : row.status === "building"
                            ? "开发中"
                            : row.status === "paused"
                              ? "已暂停"
                              : "构思中"}
                      </TagPill>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border border-[var(--color-border)] bg-[var(--color-bg-canvas)] px-2.5 py-1 text-xs text-[var(--color-text-secondary)]">
                        <VisibilityIcon className="h-3.5 w-3.5" />
                        {visibility.label}
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="min-w-[10rem]">
                        <div className="text-sm text-[var(--color-text-primary)]">{row.workspaceTitle}</div>
                        <div className="mt-1 text-[11px] font-mono text-[var(--color-text-tertiary)]">
                          {row.workspaceKind === "team" ? "Team Workspace" : "Personal Workspace"}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top text-xs text-[var(--color-text-secondary)]">
                      {formatRelativeTime(row.updatedAt, language)}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <span className="inline-flex items-center rounded-[var(--radius-pill)] border border-[var(--color-border)] bg-[var(--color-bg-canvas)] px-2 py-1 text-[11px] font-mono text-[var(--color-text-primary)]">
                        {row.collaborationIntentCount}
                      </span>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="flex justify-end gap-2">
                        <Link href={`/p/${encodeURIComponent(row.slug)}/edit`} className="btn btn-ghost px-3 py-1.5 text-xs">
                          编辑
                        </Link>
                        <Link
                          href={row.workspaceKind === "team" ? `/work/team/${encodeURIComponent(row.workspaceSlug)}` : "/work/personal"}
                          className="btn btn-secondary px-3 py-1.5 text-xs"
                        >
                          打开
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
