"use client";

import { useState } from "react";
import { PackageCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-fetch";
import type { WorkspaceDeliverable, WorkspaceSnapshot } from "@/lib/types";
import {
  Button,
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
  snapshots: WorkspaceSnapshot[];
  deliverables: WorkspaceDeliverable[];
  currentUserId: string;
  canReview: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}

function formatDeliverableDate(value?: string) {
  if (!value) return "未设置";
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function accentForStatus(status: WorkspaceDeliverable["status"]) {
  if (status === "approved") return "success" as const;
  if (status === "rejected") return "error" as const;
  if (status === "submitted") return "warning" as const;
  return "default" as const;
}

function labelForDeliverableStatus(status: WorkspaceDeliverable["status"]) {
  if (status === "approved") return "已通过";
  if (status === "rejected") return "已驳回";
  if (status === "submitted") return "待审核";
  return "草稿";
}

export function WorkspaceDeliverablesPanel({
  workspaceId,
  workspaceLabel,
  snapshots,
  deliverables,
  currentUserId,
  canReview,
  emptyTitle = "还没有交付包",
  emptyDescription = "当快照进入可评审状态后，创建第一个交付包。",
}: Props) {
  const router = useRouter();
  const [snapshotId, setSnapshotId] = useState(snapshots[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!snapshotId) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await apiFetch(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/deliverables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          snapshotId,
          title,
          description: description || undefined,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload?.error?.message ?? "创建交付包失败");
        return;
      }
      setTitle("");
      setDescription("");
      setSnapshotId(snapshots[0]?.id ?? "");
      router.refresh();
    } catch {
      setError("网络异常");
    } finally {
      setSubmitting(false);
    }
  }

  async function runSubmit(deliverableId: string) {
    setActingId(deliverableId);
    setError(null);
    try {
      const response = await apiFetch(
        `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/deliverables/${encodeURIComponent(deliverableId)}/submit`,
        { method: "POST" }
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload?.error?.message ?? "提交交付包失败");
        return;
      }
      router.refresh();
    } catch {
      setError("网络异常");
    } finally {
      setActingId(null);
    }
  }

  async function runReview(deliverableId: string, decision: "approved" | "rejected") {
    setActingId(deliverableId);
    setError(null);
    try {
      const response = await apiFetch(
        `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/deliverables/${encodeURIComponent(deliverableId)}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision }),
        }
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload?.error?.message ?? "评审交付包失败");
        return;
      }
      router.refresh();
    } catch {
      setError("网络异常");
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {error ? <ErrorBanner tone="error">{error}</ErrorBanner> : null}

      <SectionCard
        title="创建交付包"
        description={`把快照整理成 ${workspaceLabel} 可评审、可交付的状态包。`}
        icon={PackageCheck}
      >
        <form className="space-y-4" onSubmit={handleCreate}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]" htmlFor="deliverable-snapshot">
                快照
              </label>
              <select
                id="deliverable-snapshot"
                className="input-base"
                value={snapshotId}
                onChange={(event) => setSnapshotId(event.target.value)}
              >
                <option value="">请选择快照</option>
                {snapshots.map((snapshot) => (
                  <option key={snapshot.id} value={snapshot.id}>
                    {snapshot.title}
                  </option>
                ))}
              </select>
            </div>
            <Input
              id="deliverable-title"
              label="标题"
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="例如：Beta 发布交付包"
              maxLength={120}
            />
          </div>

          <Textarea
            id="deliverable-description"
            label="说明"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="说明这次交付包包含了什么，以及评审人需要验证的重点。"
            maxLength={2000}
          />

          <div className="flex justify-end">
            <Button type="submit" loading={submitting} disabled={!snapshotId || !title.trim()}>
              创建交付包
            </Button>
          </div>
        </form>
      </SectionCard>

      <SectionCard
        title="交付包列表"
        description="围绕快照完成草稿、提交与审核流程。"
      >
        {deliverables.length === 0 ? (
          <EmptyState title={emptyTitle} description={emptyDescription} />
        ) : (
          <div className="space-y-3">
            {deliverables.map((deliverable) => {
              const isOwner = deliverable.createdByUserId === currentUserId;
              const canSubmit = deliverable.status === "draft" && (isOwner || canReview);
              const canReviewItem = deliverable.status === "submitted" && canReview;
              const isBusy = actingId === deliverable.id;
              return (
                <div
                  key={deliverable.id}
                  className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-canvas)] px-4 py-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-semibold text-[var(--color-text-primary)]">{deliverable.title}</div>
                        <TagPill mono size="sm" accent={accentForStatus(deliverable.status)}>
                          {labelForDeliverableStatus(deliverable.status)}
                        </TagPill>
                      </div>
                      <div className="text-xs text-[var(--color-text-secondary)]">
                        关联快照：{deliverable.snapshotTitle ?? deliverable.snapshotId}
                      </div>
                      {deliverable.description ? (
                        <div className="text-sm text-[var(--color-text-secondary)]">{deliverable.description}</div>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {canSubmit ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          loading={isBusy}
                          disabled={isBusy}
                          onClick={() => runSubmit(deliverable.id)}
                        >
                            提交
                          </Button>
                      ) : null}
                      {canReviewItem ? (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            loading={isBusy}
                            disabled={isBusy}
                            onClick={() => runReview(deliverable.id, "approved")}
                          >
                            通过
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            loading={isBusy}
                            disabled={isBusy}
                            onClick={() => runReview(deliverable.id, "rejected")}
                          >
                            驳回
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 text-xs text-[var(--color-text-secondary)] md:grid-cols-3">
                    <div>创建者：{deliverable.createdByName ?? deliverable.createdByUserId}</div>
                    <div>提交时间：{formatDeliverableDate(deliverable.submittedAt)}</div>
                    <div>
                      审核结果：{deliverable.reviewedAt ? `${deliverable.reviewedByName ?? deliverable.reviewedByUserId} · ${formatDeliverableDate(deliverable.reviewedAt)}` : "尚未审核"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
