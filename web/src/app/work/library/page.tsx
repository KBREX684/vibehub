import Link from "next/link";
import { redirect } from "next/navigation";
import { FolderOpenDot, Plus, Upload } from "lucide-react";
import { getSessionUserFromCookie } from "@/lib/auth";
import { listWorkLibraryItems } from "@/lib/work-console";
import { EmptyState, PageHeader, TagPill } from "@/components/ui";
import { WorkViewTabs } from "@/components/work-view-tabs";

interface Props {
  searchParams?: Promise<{ status?: string }>;
}

const TABS = [
  { label: "全部", value: "default" },
  { label: "草稿", value: "draft" },
  { label: "公开", value: "public" },
  { label: "私密", value: "private" },
  { label: "开源", value: "open-source" },
  { label: "归档", value: "archived" },
];

export default async function WorkLibraryPage({ searchParams }: Props) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    redirect("/login?redirect=/work/library");
  }

  const sp = (await searchParams) ?? {};
  const status = sp.status as "draft" | "public" | "private" | "open-source" | "archived" | undefined;
  const items = await listWorkLibraryItems({ userId: session.userId, status });

  return (
    <div className="space-y-5">
      <PageHeader
        icon={FolderOpenDot}
        eyebrow="工作台"
        title="项目库"
        subtitle="集中查看你拥有或正在协作的项目，并统一进入对应工作区。"
        actions={
          <>
            <Link href="/p/new" className="btn btn-secondary text-sm px-4 py-2 inline-flex items-center gap-1.5">
              <Plus className="w-4 h-4" />
              新建项目
            </Link>
            <button type="button" className="btn btn-ghost text-sm px-4 py-2 inline-flex items-center gap-1.5" disabled>
              <Upload className="w-4 h-4" />
              导入项目
            </button>
          </>
        }
      />

      <WorkViewTabs basePath="/work/library" current={status ?? "default"} tabs={TABS} paramName="status" />

      {items.length === 0 ? (
        <EmptyState title="当前视图下还没有项目" description="切换筛选标签，或先创建一个项目来填充你的项目库。" />
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-bg-surface)]">
          <table className="min-w-full border-collapse">
            <caption className="sr-only">项目库</caption>
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-[11px] font-mono uppercase tracking-[0.12em] text-[var(--color-text-tertiary)]">
                <th className="px-4 py-3">项目</th>
                <th className="px-4 py-3">工作区</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3 text-center">协作意向</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-b border-[var(--color-border-subtle)] last:border-b-0">
                  <td className="px-4 py-4 align-top">
                    <div className="min-w-[16rem]">
                      <Link href={`/p/${encodeURIComponent(row.slug)}`} className="text-sm font-medium text-[var(--color-text-primary)] hover:underline">
                        {row.title}
                      </Link>
                      <div className="mt-1 text-xs text-[var(--color-text-secondary)]">{row.oneLiner}</div>
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top text-xs text-[var(--color-text-secondary)]">{row.workspaceTitle}</td>
                  <td className="px-4 py-4 align-top">
                    <TagPill mono size="sm" accent={row.openSource ? "success" : row.visibility === "public" ? "cyan" : "default"}>
                      {row.openSource ? "开源" : row.visibility === "public" ? "公开" : row.visibility === "private" ? "私密" : "草稿"}
                    </TagPill>
                  </td>
                  <td className="px-4 py-4 align-top text-center text-xs text-[var(--color-text-secondary)]">{row.collaborationIntentCount}</td>
                  <td className="px-4 py-4 align-top">
                    <div className="flex justify-end gap-2">
                      <Link href={`/p/${encodeURIComponent(row.slug)}/edit`} className="btn btn-ghost text-xs px-3 py-1.5">
                        编辑
                      </Link>
                      <Link href={row.team?.slug ? `/work/team/${encodeURIComponent(row.team.slug)}` : "/work/personal"} className="btn btn-secondary text-xs px-3 py-1.5">
                        打开
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
