"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Bot, CheckCircle2, Clock3, Cpu, FileText, ShieldCheck, XCircle } from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";
import type { WorkAgentTaskItem } from "@/lib/types";
import { Button, EmptyState, ErrorBanner, TagPill } from "@/components/ui";

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

function iconForStatus(status: WorkAgentTaskItem["status"]) {
  if (status === "done") return CheckCircle2;
  if (status === "failed") return XCircle;
  if (status === "pending_confirm") return Clock3;
  return Cpu;
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

      <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-bg-surface)]">
        <div className="grid min-h-[38rem] grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)]">
          <section className="border-b border-[var(--color-border)] bg-[var(--color-bg-canvas)]/50 lg:border-b-0 lg:border-r">
            <div className="border-b border-[var(--color-border)] px-4 py-4">
              <div className="text-sm font-semibold text-[var(--color-text-primary)]">任务流</div>
              <div className="mt-1 text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
                Workspace-scoped execution
              </div>
            </div>

            <div className="max-h-[38rem] overflow-y-auto">
              {rows.map((row) => {
                const active = row.id === selected?.id;
                const StatusIcon = iconForStatus(row.status);
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => setSelectedId(row.id)}
                    className={[
                      "w-full border-b border-[var(--color-border-subtle)] px-4 py-4 text-left transition-colors last:border-b-0",
                      active
                        ? "bg-[var(--color-bg-elevated)]"
                        : "bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-elevated)]/60",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="text-sm font-semibold text-[var(--color-text-primary)]">{row.title}</div>
                        <div className="text-xs text-[var(--color-text-secondary)]">{row.subtitle}</div>
                      </div>
                      <TagPill mono size="sm" accent={accentForStatus(row.status)}>
                        {labelForStatus(row.status)}
                      </TagPill>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-mono text-[var(--color-text-tertiary)]">
                      <span className="inline-flex items-center gap-1">
                        <StatusIcon className="h-3.5 w-3.5" />
                        {row.agentLabel ?? "系统"}
                      </span>
                      <span>{row.workspaceTitle ?? row.teamName ?? "个人工作区"}</span>
                      <span>{formatAgentTaskDate(row.createdAt)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="min-w-0">
            {selected ? (
              <>
                <div className="border-b border-[var(--color-border)] px-5 py-5 md:px-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <TagPill mono size="sm" accent={accentForStatus(selected.status)}>
                          {labelForStatus(selected.status)}
                        </TagPill>
                        <TagPill mono size="sm" accent="default">
                          {selected.scope === "team" ? "团队工作区" : "个人工作区"}
                        </TagPill>
                        {selected.agentLabel ? (
                          <TagPill mono size="sm" accent="default">
                            {selected.agentLabel}
                          </TagPill>
                        ) : null}
                      </div>
                      <h2 className="m-0 text-lg font-semibold tracking-tight text-[var(--color-text-primary)]">
                        {selected.title}
                      </h2>
                      <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{selected.subtitle}</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 px-5 py-5 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] md:px-6">
                  <div className="space-y-4">
                    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-canvas)] p-4">
                      <div className="mb-3 text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
                        执行上下文
                      </div>
                      <div className="space-y-2 text-sm text-[var(--color-text-secondary)]">
                        <div>动作：{selected.action.replaceAll("_", " ")}</div>
                        <div>目标：{selected.targetType} · {selected.targetId}</div>
                        <div>工作区：{selected.workspaceTitle ?? selected.teamName ?? "个人工作区"}</div>
                        <div>创建时间：{formatAgentTaskDate(selected.createdAt)}</div>
                        <div>完成时间：{selected.completedAt ? formatAgentTaskDate(selected.completedAt) : "尚未完成"}</div>
                      </div>
                    </div>

                    {selected.metadata && Object.keys(selected.metadata).length > 0 ? (
                      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-canvas)] p-4">
                        <div className="mb-3 flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
                          <FileText className="h-3.5 w-3.5" />
                          元数据
                        </div>
                        <pre className="m-0 overflow-x-auto whitespace-pre-wrap break-words text-xs leading-relaxed text-[var(--color-text-secondary)]">
                          {JSON.stringify(selected.metadata, null, 2)}
                        </pre>
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-canvas)] p-4">
                      <div className="mb-3 flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        确认与审计
                      </div>
                      <div className="space-y-2 text-sm text-[var(--color-text-secondary)]">
                        <div>确认单：{selected.confirmationRequestId ?? "无"}</div>
                        <div>确认状态：{selected.confirmationStatus ?? "未进入确认流"}</div>
                      </div>

                      {selected.canDecideConfirmation && selected.confirmationRequestId ? (
                        <div className="mt-4 flex flex-wrap gap-2">
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

                    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-canvas)] p-4">
                      <div className="mb-3 flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
                        <Bot className="h-3.5 w-3.5" />
                        任务说明
                      </div>
                      <p className="m-0 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                        这里展示的是已经进入 v10 工作台主面的 Agent 执行记录。高风险写操作需要先进入确认流，批准后才会真正改动工作区对象。
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="px-6 py-10">
                <EmptyState title="未选择任务" description="从左侧选择一个任务查看上下文、元数据和确认动作。" />
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
