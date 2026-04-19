"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { apiFetch } from "@/lib/api-fetch";
import type { WorkAgentTaskItem } from "@/lib/types";
import {
  Button,
  EmptyState,
  ErrorBanner,
  SectionCard,
  TagPill,
} from "@/components/ui";

interface Props {
  items: WorkAgentTaskItem[];
  initialTaskId?: string;
  initialConfirmationId?: string;
}

function accentForStatus(status: WorkAgentTaskItem["status"]) {
  if (status === "done") return "success" as const;
  if (status === "failed") return "error" as const;
  return "warning" as const;
}

function labelForStatus(status: WorkAgentTaskItem["status"]) {
  if (status === "done") return "已完成";
  if (status === "failed") return "失败";
  if (status === "pending_confirm") return "待确认";
  return "运行中";
}

function formatAgentTaskDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function WorkAgentTasksClient({
  items,
  initialTaskId,
  initialConfirmationId,
}: Props) {
  const [rows, setRows] = useState(items);
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const byTask = initialTaskId ? items.find((item) => item.id === initialTaskId) : null;
    if (byTask) return byTask.id;
    const byConfirmation = initialConfirmationId
      ? items.find((item) => item.confirmationRequestId === initialConfirmationId)
      : null;
    if (byConfirmation) return byConfirmation.id;
    return items[0]?.id ?? null;
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setRows(items);
  }, [items]);

  const selected = useMemo(
    () => rows.find((row) => row.id === selectedId) ?? rows[0] ?? null,
    [rows, selectedId]
  );

  async function decideConfirmation(decision: "approved" | "rejected") {
    if (!selected?.confirmationRequestId) return;
    setError(null);
    startTransition(async () => {
      try {
        const response = await apiFetch("/api/v1/me/agent-confirmations", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requestId: selected.confirmationRequestId,
            decision,
          }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          setError(payload?.error?.message ?? "更新确认状态失败");
          return;
        }
        setRows((current) =>
          current.map((row) =>
            row.id === selected.id
              ? {
                  ...row,
                  status: decision === "approved" ? "done" : "failed",
                  confirmationStatus: decision,
                  canDecideConfirmation: false,
                  completedAt: new Date().toISOString(),
                }
              : row
          )
        );
      } catch {
        setError("网络异常");
      }
    });
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        title="当前视图下还没有 Agent 任务"
        description="当 Agent 开始对工作区或团队动作产生执行与确认记录时，这里会显示对应任务。"
      />
    );
  }

  return (
    <div className="space-y-4">
      {error ? <ErrorBanner tone="error">{error}</ErrorBanner> : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <SectionCard title="任务流" description="按工作区聚合的 Agent 执行与确认请求。">
          <div className="space-y-3">
            {rows.map((row) => {
              const active = row.id === selected?.id;
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setSelectedId(row.id)}
                  className={`w-full rounded-[var(--radius-md)] border px-4 py-3 text-left transition-colors ${
                    active
                      ? "border-[var(--color-border-strong)] bg-[var(--color-bg-elevated)]"
                      : "border-[var(--color-border)] bg-[var(--color-bg-canvas)] hover:border-[var(--color-border-strong)]"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="text-sm font-semibold text-[var(--color-text-primary)]">{row.title}</div>
                      <div className="text-xs text-[var(--color-text-secondary)]">{row.subtitle}</div>
                    </div>
                    <TagPill mono size="sm" accent={accentForStatus(row.status)}>
                      {labelForStatus(row.status)}
                    </TagPill>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                    <span>{row.workspaceTitle ?? row.teamName ?? "工作区"}</span>
                    {row.agentLabel ? <span>· {row.agentLabel}</span> : null}
                    <span>· {formatAgentTaskDate(row.createdAt)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard
          title={selected?.title ?? "任务详情"}
          description="支持确认的任务可以直接在这里批准或拒绝。"
        >
          {selected ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <TagPill mono size="sm" accent={accentForStatus(selected.status)}>
                  {labelForStatus(selected.status)}
                </TagPill>
                {selected.scope === "team" ? (
                    <TagPill mono size="sm" accent="default">
                    团队
                  </TagPill>
                ) : (
                  <TagPill mono size="sm" accent="default">
                    个人
                  </TagPill>
                )}
              </div>

              <div className="space-y-2 text-sm text-[var(--color-text-secondary)]">
                <div>{selected.subtitle}</div>
                <div>动作：{selected.action.replaceAll("_", " ")}</div>
                <div>目标：{selected.targetType} · {selected.targetId}</div>
                <div>工作区：{selected.workspaceTitle ?? selected.teamName ?? "个人工作区"}</div>
                <div>创建时间：{formatAgentTaskDate(selected.createdAt)}</div>
                <div>
                  完成时间：{selected.completedAt ? formatAgentTaskDate(selected.completedAt) : "尚未完成"}
                </div>
              </div>

              {selected.metadata && Object.keys(selected.metadata).length > 0 ? (
                <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-canvas)] p-3">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-tertiary)]">
                    元数据
                  </div>
                  <pre className="m-0 overflow-x-auto whitespace-pre-wrap break-words text-xs text-[var(--color-text-secondary)]">
                    {JSON.stringify(selected.metadata, null, 2)}
                  </pre>
                </div>
              ) : null}

              {selected.canDecideConfirmation && selected.confirmationRequestId ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={isPending}
                    disabled={isPending}
                    onClick={() => decideConfirmation("approved")}
                  >
                    批准
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    loading={isPending}
                    disabled={isPending}
                    onClick={() => decideConfirmation("rejected")}
                  >
                    拒绝
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </SectionCard>
      </div>
    </div>
  );
}
