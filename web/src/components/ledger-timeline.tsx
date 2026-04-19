"use client";

/**
 * LedgerTimeline — Vertical timeline for Ledger entries.
 *
 * Visual spec:
 * - Left side: 1px dashed vertical track
 * - Each entry: actor avatar + name + relative time → actionKind label + target chip → LedgerStampBadge
 * - Same-day entries grouped with sticky date separator
 * - "Load more" button at bottom
 */

import { LedgerStampBadge } from "@/components/ledger-stamp-badge";
import type { LedgerEntry } from "@/lib/data/mock-ledger";
import { useLanguage } from "@/app/context/LanguageContext";
import {
  Upload,
  Camera,
  Check,
  Bot,
  Stamp,
  Anchor,
} from "lucide-react";

interface LedgerTimelineProps {
  entries: LedgerEntry[];
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
}

const ACTION_KIND_CONFIG: Record<string, { icon: typeof Upload; labelKey: string }> = {
  "workspace.artifact.upload": { icon: Upload, labelKey: "ledger.kind.workspace.artifact.upload" },
  "snapshot.create": { icon: Camera, labelKey: "ledger.kind.snapshot.create" },
  "deliverable.approve": { icon: Check, labelKey: "ledger.kind.deliverable.approve" },
  "agent.task.complete": { icon: Bot, labelKey: "ledger.kind.agent.task.complete" },
  "aigc.stamp.apply": { icon: Stamp, labelKey: "ledger.kind.aigc.stamp.apply" },
  "ledger.anchor.apply": { icon: Anchor, labelKey: "ledger.kind.ledger.anchor.apply" },
};

function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 30) return `${days} 天前`;
  return new Date(iso).toLocaleDateString("zh-CN");
}

function dateKey(iso: string): string {
  return new Date(iso).toISOString().split("T")[0];
}

function groupByDate(entries: LedgerEntry[]): Map<string, LedgerEntry[]> {
  const groups = new Map<string, LedgerEntry[]>();
  for (const entry of entries) {
    const key = dateKey(entry.signedAt);
    const group = groups.get(key) ?? [];
    group.push(entry);
    groups.set(key, group);
  }
  return groups;
}

export function LedgerTimeline({ entries, hasMore, loading, onLoadMore }: LedgerTimelineProps) {
  const { t } = useLanguage();
  const groups = groupByDate(entries);

  return (
    <div className="relative">
      {/* Dashed vertical track */}
      <div
        className="absolute left-[15px] top-0 bottom-0"
        style={{ borderLeft: "1px dashed var(--color-border-strong)" }}
      />

      <div className="space-y-6">
        {Array.from(groups.entries()).map(([date, group]) => (
          <div key={date}>
            {/* Date separator */}
            <div className="sticky top-0 z-10 bg-[var(--color-bg-canvas)] py-2">
              <span
                className="inline-block text-[11px] font-mono text-[var(--color-text-muted)] px-2 py-0.5 rounded-[var(--radius-sm)] bg-[var(--color-bg-surface)] border border-[var(--color-border)]"
              >
                {date}
              </span>
            </div>

            <div className="space-y-0">
              {group.map((entry) => (
                <TimelineEntry key={entry.id} entry={entry} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center pt-6">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loading}
            className="px-4 py-2 text-xs font-mono text-[var(--color-text-secondary)] border border-[var(--color-border)] rounded-[var(--radius-md)] hover:bg-[var(--color-bg-surface)] transition-colors disabled:opacity-50"
          >
            {loading ? "加载中..." : "加载更多"}
          </button>
        </div>
      )}

      {entries.length === 0 && (
        <div className="py-12 text-center text-[var(--color-text-muted)] text-sm">
          还没有 Ledger 记录。去 Studio 做点事吧。
        </div>
      )}
    </div>
  );
}

function TimelineEntry({ entry }: { entry: LedgerEntry }) {
  const { t } = useLanguage();
  const config = ACTION_KIND_CONFIG[entry.actionKind];
  const Icon = config?.icon ?? Upload;
  const labelKey = config?.labelKey ?? entry.actionKind;

  return (
    <div className="relative flex gap-4 py-3 pl-8">
      {/* Dot/icon on the track */}
      <div
        className="absolute left-[8px] top-[14px] w-[15px] h-[15px] rounded-full bg-[var(--color-bg-canvas)] border border-[var(--color-border-strong)] flex items-center justify-center"
      >
        <Icon className="w-2.5 h-2.5 text-[var(--color-text-muted)]" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Top row: actor + time */}
        <div className="flex items-center gap-2 mb-1">
          <span
            className="shrink-0 w-5 h-5 rounded-full bg-[var(--color-bg-elevated)] border border-[var(--color-border)] flex items-center justify-center text-[9px] font-mono text-[var(--color-text-muted)]"
          >
            {entry.actorType === "agent" ? "AI" : "U"}
          </span>
          <span className="text-sm text-[var(--color-text-primary)]">
            {entry.actorType === "agent" ? "Agent" : "你"}
          </span>
          <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
            {relativeTime(entry.signedAt)}
          </span>
        </div>

        {/* Middle row: actionKind + target */}
        <div className="flex items-center gap-2 flex-wrap mb-1.5">
          <span className="text-sm text-[var(--color-text-secondary)]">
            {t(labelKey, entry.actionKind)}
          </span>
          {entry.targetType && entry.targetId && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[var(--radius-sm)] bg-[var(--color-bg-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
              {entry.targetType}:{entry.targetId}
            </span>
          )}
        </div>

        {/* Bottom row: stamp badge */}
        <LedgerStampBadge entry={entry} />
      </div>
    </div>
  );
}
