"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-fetch";
import type { WorkIntentInboxItem, WorkIntentTab } from "@/lib/types";
import { Button, ErrorBanner, SectionCard } from "@/components/ui";

interface Props {
  items: WorkIntentInboxItem[];
  tab: WorkIntentTab;
}

export function WorkIntentsClient({ items, tab }: Props) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function performOwnerAction(
    item: WorkIntentInboxItem,
    action: "approve" | "reject" | "ignore" | "block"
  ) {
    setLoadingId(item.id);
    setError(null);
    try {
      const path =
        action === "ignore"
          ? `/api/v1/projects/${encodeURIComponent(item.projectSlug)}/collaboration-intents/${encodeURIComponent(item.id)}/ignore`
          : action === "block"
            ? `/api/v1/projects/${encodeURIComponent(item.projectSlug)}/collaboration-intents/${encodeURIComponent(item.id)}/block-and-report`
            : `/api/v1/projects/${encodeURIComponent(item.projectSlug)}/collaboration-intents/${encodeURIComponent(item.id)}/review`;
      const payload =
        action === "approve" || action === "reject"
          ? { action }
          : action === "block"
            ? { note: "Blocked from workspace inbox by project owner." }
            : {};
      const res = await apiFetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json?.error?.message ?? "操作失败");
        return;
      }
      router.refresh();
    } catch {
      setError("网络异常");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {error ? <ErrorBanner tone="error">{error}</ErrorBanner> : null}
      {items.map((item) => (
        <SectionCard
          key={item.id}
          title={item.projectTitle}
          description={`${item.applicantName} · ${new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium" }).format(new Date(item.createdAt))}`}
          padding="md"
        >
          <div className="space-y-3 text-sm text-[var(--color-text-secondary)]">
            <div>
              <div className="mb-1 text-[11px] font-mono uppercase tracking-[0.12em] text-[var(--color-text-tertiary)]">我是谁 / 我能做什么</div>
              <p className="m-0 whitespace-pre-wrap">{item.pitch || item.message}</p>
            </div>
            {item.whyYou ? (
              <div>
                <div className="mb-1 text-[11px] font-mono uppercase tracking-[0.12em] text-[var(--color-text-tertiary)]">我为什么联系你</div>
                <p className="m-0 whitespace-pre-wrap">{item.whyYou}</p>
              </div>
            ) : null}
            {item.howCollab ? (
              <div>
                <div className="mb-1 text-[11px] font-mono uppercase tracking-[0.12em] text-[var(--color-text-tertiary)]">我希望怎样合作</div>
                <p className="m-0 whitespace-pre-wrap">{item.howCollab}</p>
              </div>
            ) : null}
          </div>

          {tab === "received" ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={loadingId !== null}
                onClick={() => void performOwnerAction(item, "approve")}
              >
                {loadingId === item.id ? "…" : "接受"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={loadingId !== null}
                onClick={() => void performOwnerAction(item, "reject")}
              >
                婉拒
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={loadingId !== null}
                onClick={() => void performOwnerAction(item, "ignore")}
              >
                忽略
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={loadingId !== null}
                onClick={() => void performOwnerAction(item, "block")}
              >
                拉黑并举报
              </Button>
            </div>
          ) : null}
        </SectionCard>
      ))}
    </div>
  );
}
