"use client";

import { useRef, useState } from "react";
import { Download, HardDrive, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-fetch";
import type { WorkspaceArtifact } from "@/lib/types";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorBanner,
  SectionCard,
  TagPill,
} from "@/components/ui";

interface WorkspaceArtifactStorage {
  usedBytes: number;
  limitBytes: number;
  maxFileBytes: number;
  configured: boolean;
  mode: "mock" | "object_storage" | "unconfigured";
}

interface Props {
  workspaceId: string;
  workspaceLabel: string;
  artifacts: WorkspaceArtifact[];
  storage: WorkspaceArtifactStorage;
  currentUserId: string;
  canDeleteAll?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatArtifactDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusAccent(status: WorkspaceArtifact["validationState"]) {
  if (status === "ready") return "success" as const;
  if (status === "rejected") return "error" as const;
  return "warning" as const;
}

function statusLabel(status: WorkspaceArtifact["validationState"]) {
  if (status === "ready") return "已就绪";
  if (status === "rejected") return "已拒绝";
  return "处理中";
}

export function WorkspaceArtifactsPanel({
  workspaceId,
  workspaceLabel,
  artifacts,
  storage,
  currentUserId,
  canDeleteAll = false,
  emptyTitle = "还没有文件",
  emptyDescription = "上传第一个工作区文件，开始建立共享资产轨迹。",
}: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkspaceArtifact | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usagePercent =
    storage.limitBytes > 0 ? Math.min(100, Math.round((storage.usedBytes / storage.limitBytes) * 100)) : 0;

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFile) return;
    setUploading(true);
    setError(null);

    try {
      const response = await apiFetch(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/artifacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: selectedFile.name,
          contentType: selectedFile.type || "application/octet-stream",
          sizeBytes: selectedFile.size,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload?.error?.message ?? "发起上传失败");
        return;
      }

      const result = payload?.data as
        | {
            upload?: { uploadUrl: string; requiredHeaders: Record<string, string>; completeUrl: string };
          }
        | undefined;

      if (result?.upload) {
        const uploadHeaders = Object.fromEntries(
          Object.entries(result.upload.requiredHeaders ?? {}).filter(
            ([key]) => key.toLowerCase() !== "content-length"
          )
        );
        const uploadResponse = await fetch(result.upload.uploadUrl, {
          method: "PUT",
          headers: uploadHeaders,
          body: selectedFile,
        });
        if (!uploadResponse.ok) {
          setError("对象存储上传失败");
          return;
        }

        const completeResponse = await apiFetch(result.upload.completeUrl, { method: "POST" });
        const completePayload = await completeResponse.json().catch(() => ({}));
        if (!completeResponse.ok) {
          setError(completePayload?.error?.message ?? "确认上传失败");
          return;
        }
      }

      setSelectedFile(null);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch {
      setError("网络异常");
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(artifact: WorkspaceArtifact) {
    setDownloadingId(artifact.id);
    setError(null);
    try {
      const response = await apiFetch(
        `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/artifacts/${encodeURIComponent(artifact.id)}/download-url`
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload?.error?.message ?? "生成下载链接失败");
        return;
      }
      const downloadUrl = payload?.data?.downloadUrl;
      if (typeof downloadUrl !== "string" || !downloadUrl) {
        setError("缺少下载链接");
        return;
      }
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = artifact.filename;
      link.rel = "noreferrer";
      if (!downloadUrl.startsWith("data:")) {
        link.target = "_blank";
      }
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      setError("网络异常");
    } finally {
      setDownloadingId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      const response = await apiFetch(
        `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/artifacts/${encodeURIComponent(deleteTarget.id)}`,
        { method: "DELETE" }
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload?.error?.message ?? "删除文件失败");
        return;
      }
      setDeleteTarget(null);
      router.refresh();
    } catch {
      setError("网络异常");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      {error ? <ErrorBanner tone="error">{error}</ErrorBanner> : null}
      {storage.mode === "mock" ? (
        <ErrorBanner tone="info">{workspaceLabel} 当前使用本地 mock 文件存储，上传内容只保留在演示环境内存中。</ErrorBanner>
      ) : null}
      {storage.mode === "unconfigured" ? (
        <ErrorBanner tone="warning">当前环境尚未配置对象存储，暂时不能上传工作区文件。</ErrorBanner>
      ) : null}

      <SectionCard
        title="工作区文件"
        description={`上传并管理 ${workspaceLabel} 的共享资产。`}
        icon={HardDrive}
        actions={
          <TagPill mono size="sm" accent={usagePercent >= 90 ? "warning" : "default"}>
            {formatBytes(storage.usedBytes)} / {formatBytes(storage.limitBytes)}
          </TagPill>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-xs text-[var(--color-text-secondary)]">
              <span>已用存储</span>
              <span>{usagePercent}%</span>
            </div>
            <div className="h-2 rounded-full bg-[var(--color-bg-canvas)] border border-[var(--color-border)] overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--color-primary)] transition-[width] duration-200"
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            <p className="m-0 text-xs text-[var(--color-text-secondary)]">
              单文件上限：{formatBytes(storage.maxFileBytes)}
            </p>
          </div>

          <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]" onSubmit={handleUpload}>
            <input
              ref={inputRef}
              type="file"
              className="block w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-canvas)] px-3 py-2 text-sm text-[var(--color-text-primary)] file:mr-3 file:rounded-[var(--radius-sm)] file:border file:border-[var(--color-border)] file:bg-[var(--color-bg-surface)] file:px-3 file:py-1.5 file:text-xs file:text-[var(--color-text-primary)]"
              onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
              disabled={uploading || storage.mode === "unconfigured"}
            />
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="min-w-[9rem]"
              loading={uploading}
              disabled={!selectedFile || storage.mode === "unconfigured"}
            >
              <Upload className="h-4 w-4" />
              上传文件
            </Button>
          </form>
        </div>
      </SectionCard>

      <SectionCard
        title="文件记录"
        description="文件会保留在工作区内，并持续显示校验状态与上传记录。"
      >
        {artifacts.length === 0 ? (
          <EmptyState title={emptyTitle} description={emptyDescription} />
        ) : (
          <div className="space-y-3">
            {artifacts.map((artifact) => {
              const canDelete = canDeleteAll || artifact.uploaderUserId === currentUserId;
              return (
                <div
                  key={artifact.id}
                  className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-canvas)] px-4 py-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-semibold text-[var(--color-text-primary)] break-all">
                          {artifact.filename}
                        </div>
                        <TagPill mono size="sm" accent={statusAccent(artifact.validationState)}>
                          {statusLabel(artifact.validationState)}
                        </TagPill>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                        <span>{formatBytes(artifact.sizeBytes)}</span>
                        <span>•</span>
                        <span>{artifact.contentType}</span>
                        <span>•</span>
                        <span>{artifact.uploaderName ?? "未知上传者"}</span>
                        <span>•</span>
                        <span>{formatArtifactDate(artifact.createdAt)}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={artifact.validationState !== "ready" || downloadingId === artifact.id}
                        loading={downloadingId === artifact.id}
                        onClick={() => handleDownload(artifact)}
                      >
                        <Download className="h-4 w-4" />
                        下载
                      </Button>
                      {canDelete ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget(artifact)}
                        >
                          <Trash2 className="h-4 w-4" />
                          删除
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => (deleting ? undefined : setDeleteTarget(null))}
        onConfirm={confirmDelete}
        title="删除工作区文件"
        description={
          deleteTarget
            ? `确定要从 ${workspaceLabel} 中删除 ${deleteTarget.filename} 吗？这会移除该文件在工作区中的记录。`
            : undefined
        }
        confirmLabel="删除文件"
        tone="destructive"
      />
    </div>
  );
}
