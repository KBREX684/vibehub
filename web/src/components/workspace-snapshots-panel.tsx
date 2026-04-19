"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-fetch";
import type { WorkspaceProjectReference, WorkspaceSnapshot } from "@/lib/types";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorBanner,
  Input,
  SectionCard,
  TagPill,
  Textarea,
} from "@/components/ui";

interface Props {
  workspaceId: string;
  workspaceLabel: string;
  projects: WorkspaceProjectReference[];
  snapshots: WorkspaceSnapshot[];
  canRollback: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}

function formatSnapshotDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function WorkspaceSnapshotsPanel({
  workspaceId,
  workspaceLabel,
  projects,
  snapshots,
  canRollback,
  emptyTitle = "还没有快照",
  emptyDescription = "创建第一个快照，沉淀一个可交接、可回滚的工作区状态。",
}: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [goal, setGoal] = useState("");
  const [roleNotes, setRoleNotes] = useState("");
  const [previousSnapshotId, setPreviousSnapshotId] = useState("");
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>(projects.map((project) => project.id));
  const [submitting, setSubmitting] = useState(false);
  const [rollbackTarget, setRollbackTarget] = useState<WorkspaceSnapshot | null>(null);
  const [rollingBack, setRollingBack] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const projectMap = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);

  function toggleProject(projectId: string) {
    setSelectedProjectIds((current) =>
      current.includes(projectId)
        ? current.filter((item) => item !== projectId)
        : [...current, projectId]
    );
  }

  async function handleCreateSnapshot(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await apiFetch(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/snapshots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          summary,
          goal: goal || undefined,
          roleNotes: roleNotes || undefined,
          previousSnapshotId: previousSnapshotId || undefined,
          projectIds: selectedProjectIds,
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setError(payload?.error?.message ?? "创建快照失败");
        return;
      }
      setTitle("");
      setSummary("");
      setGoal("");
      setRoleNotes("");
      setPreviousSnapshotId("");
      setSelectedProjectIds(projects.map((project) => project.id));
      router.refresh();
    } catch {
      setError("网络异常");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRollbackSnapshot() {
    if (!rollbackTarget) return;
    setRollingBack(true);
    setError(null);
    try {
      const response = await apiFetch(
        `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/snapshots/${encodeURIComponent(rollbackTarget.id)}/rollback`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setError(payload?.error?.message ?? "创建回滚快照失败");
        return;
      }
      setRollbackTarget(null);
      router.refresh();
    } catch {
      setError("网络异常");
    } finally {
      setRollingBack(false);
    }
  }

  return (
    <div className="space-y-4">
      {error ? <ErrorBanner tone="error">{error}</ErrorBanner> : null}

      <SectionCard
        title="创建快照"
        description={`为 ${workspaceLabel} 记录一个稳定、可交接的状态包。`}
      >
        <form className="space-y-4" onSubmit={handleCreateSnapshot}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              id="snapshot-title"
              label="标题"
              required
              placeholder="例如：内测交付快照"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]" htmlFor="snapshot-source">
                基于已有快照
              </label>
              <select
                id="snapshot-source"
                className="input-base"
                value={previousSnapshotId}
                onChange={(event) => setPreviousSnapshotId(event.target.value)}
              >
                <option value="">不基于历史快照</option>
                {snapshots.map((snapshot) => (
                  <option key={snapshot.id} value={snapshot.id}>
                    {snapshot.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Textarea
            id="snapshot-summary"
            label="摘要"
            required
            placeholder="说明这次快照包含了什么、哪些部分已就绪，以及下一个执行者应信任什么。"
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            maxLength={500}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Textarea
              id="snapshot-goal"
              label="目标"
              placeholder="可选：这次快照对应的目标或交付节点。"
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              maxLength={500}
            />
            <Textarea
              id="snapshot-role-notes"
              label="角色备注"
              placeholder="可选：给设计、开发、测试或运维的交接说明。"
              value={roleNotes}
              onChange={(event) => setRoleNotes(event.target.value)}
              maxLength={2000}
            />
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-[var(--color-text-secondary)]">包含的项目</div>
            {projects.length === 0 ? (
              <p className="m-0 text-sm text-[var(--color-text-secondary)]">
                当前工作区还没有可用项目。
              </p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2">
                {projects.map((project) => {
                  const checked = selectedProjectIds.includes(project.id);
                  return (
                    <label
                      key={project.id}
                      className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-canvas)] px-3 py-3 text-sm text-[var(--color-text-primary)]"
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={checked}
                        onChange={() => toggleProject(project.id)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{project.title}</span>
                        <span className="block text-xs text-[var(--color-text-secondary)]">
                          /p/{project.slug}
                        </span>
                      </span>
                      <TagPill mono size="sm" accent={project.openSource ? "success" : "default"}>
                        {project.openSource ? "公开" : "私密"}
                      </TagPill>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="submit"
              disabled={submitting || projects.length === 0 || selectedProjectIds.length === 0}
              loading={submitting}
            >
              创建快照
            </Button>
          </div>
        </form>
      </SectionCard>

      <SectionCard
        title="快照历史"
        description="所有快照都采用追加写入。回滚不会覆盖历史，而是基于旧快照创建一个新的回滚快照。"
      >
        {snapshots.length === 0 ? (
          <EmptyState title={emptyTitle} description={emptyDescription} />
        ) : (
          <div className="space-y-3">
            {snapshots.map((snapshot) => (
              <div
                key={snapshot.id}
                className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-canvas)] px-4 py-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold text-[var(--color-text-primary)]">{snapshot.title}</div>
                      {snapshot.previousSnapshotTitle ? (
                        <TagPill mono size="sm" accent="warning">
                          来源：{snapshot.previousSnapshotTitle}
                        </TagPill>
                      ) : (
                        <TagPill mono size="sm" accent="default">
                          根快照
                        </TagPill>
                      )}
                    </div>
                    <div className="text-xs text-[var(--color-text-secondary)]">
                      {snapshot.createdByName ?? "未知成员"} · {formatSnapshotDate(snapshot.createdAt)}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {snapshot.projects.map((project) => (
                      <Link
                        key={`${snapshot.id}:${project.id}`}
                        href={`/p/${encodeURIComponent(project.slug)}/snapshots/${encodeURIComponent(snapshot.id)}`}
                        className="btn btn-ghost text-xs px-3 py-1.5"
                      >
                        查看公开快照页
                      </Link>
                    ))}
                    {canRollback ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setRollbackTarget(snapshot)}
                      >
                        回滚
                      </Button>
                    ) : null}
                  </div>
                </div>

                <p className="mt-3 mb-0 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  {snapshot.summary}
                </p>

                {snapshot.goal ? (
                  <div className="mt-3 text-xs text-[var(--color-text-secondary)]">
                    <span className="font-semibold text-[var(--color-text-primary)]">目标：</span> {snapshot.goal}
                  </div>
                ) : null}

                {snapshot.roleNotes ? (
                  <div className="mt-2 text-xs text-[var(--color-text-secondary)] whitespace-pre-wrap">
                    <span className="font-semibold text-[var(--color-text-primary)]">角色备注：</span> {snapshot.roleNotes}
                  </div>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-2">
                  {snapshot.projectIds.map((projectId) => {
                    const project = projectMap.get(projectId);
                    if (!project) return null;
                    return (
                      <TagPill key={`${snapshot.id}:${projectId}`} mono size="sm" accent="default">
                        {project.title}
                      </TagPill>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <ConfirmDialog
        open={Boolean(rollbackTarget)}
        onClose={() => {
          if (rollingBack) return;
          setRollbackTarget(null);
        }}
        onConfirm={handleRollbackSnapshot}
        confirmLabel="创建回滚快照"
        title={rollbackTarget ? `回滚到 ${rollbackTarget.title}？` : "回滚快照"}
        description="此操作不会覆盖历史记录，而是基于所选快照创建一个新的回滚快照。"
      />
    </div>
  );
}
