"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { StudioShell } from "@/components/studio-shell";
import { LedgerStampBadge } from "@/components/ui/ledger-stamp-badge";
import { PageHeader } from "@/components/ui";
import { getMockLedgerEntries, type LedgerEntry } from "@/lib/data/mock-ledger";
import { mockFetch } from "@/lib/data/mock-v11-routes";
import { isMockDataEnabled } from "@/lib/runtime-mode";
import { useLanguage } from "@/app/context/LanguageContext";
import {
  Download,
  Filter,
  Anchor,
  X,
  Check,
  Receipt,
  Upload,
  Camera,
  Send,
  Inbox,
  Bot,
  Stamp,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

const WORKSPACE_ID = "ws_personal_alice";

// Action kind to icon and verb mapping
const actionKindConfig: Record<string, { icon: typeof Receipt; verb: string }> = {
  "workspace.artifact.upload": { icon: Upload, verb: "上传文件" },
  "workspace.artifact.validated": { icon: Check, verb: "文件校验通过" },
  "snapshot.create": { icon: Camera, verb: "创建快照" },
  "snapshot.publish": { icon: Send, verb: "发布快照" },
  "deliverable.submit": { icon: Inbox, verb: "提交交付" },
  "deliverable.approve": { icon: Check, verb: "确认交付" },
  "deliverable.reject": { icon: X, verb: "驳回交付" },
  "agent.task.start": { icon: Bot, verb: "Agent 开始任务" },
  "agent.task.complete": { icon: Bot, verb: "Agent 完成" },
  "agent.task.fail": { icon: X, verb: "Agent 失败" },
  "aigc.stamp.apply": { icon: Stamp, verb: "添加 AIGC 标识" },
  "ledger.anchor.apply": { icon: ShieldCheck, verb: "锚定到司法链" },
};

function getActionConfig(actionKind: string) {
  return actionKindConfig[actionKind] || { icon: Receipt, verb: actionKind.split(".").pop() || actionKind };
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  return `${days} 天前`;
}

function LedgerPageContent() {
  const { t } = useLanguage();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [actorFilter, setActorFilter] = useState<"all" | "user" | "agent">("all");
  const [kindFilter, setKindFilter] = useState<string>("all");

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        if (isMockDataEnabled()) {
          const mock = await mockFetch<{ items: LedgerEntry[] }>(
            "GET",
            "/api/v1/me/ledger?limit=50"
          );
          if (mock?.data?.items) {
            setEntries(mock.data.items);
          }
        } else {
          const res = await fetch("/api/v1/me/ledger?limit=50");
          const json = await res.json();
          if (json.items) {
            setEntries(json.items);
          }
        }
      } catch {
        setEntries(getMockLedgerEntries());
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (actorFilter !== "all" && e.actorType !== actorFilter) return false;
      if (kindFilter !== "all" && e.actionKind !== kindFilter) return false;
      return true;
    });
  }, [entries, actorFilter, kindFilter]);

  // Group entries by date
  const groupedEntries = useMemo(() => {
    const groups: Record<string, LedgerEntry[]> = {};
    filteredEntries.forEach((entry) => {
      const date = new Date(entry.signedAt).toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(entry);
    });
    return groups;
  }, [filteredEntries]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const uniqueKinds = Array.from(new Set(entries.map((e) => e.actionKind)));

  return (
    <div className="h-full flex flex-col">
      {/* Page Header */}
      <div className="px-6 py-6 border-b border-[var(--color-border-subtle)]">
        <PageHeader
          eyebrow="AI 操作公证账本"
          title="Ledger"
          subtitle="你和 Agent 的每一次写入都在这里。可校验、可外发、可作为合规凭证。"
          icon={Receipt}
        />
      </div>

      {/* Filter Bar */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-6 py-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-canvas)]">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-bg-surface)] border border-[var(--color-border)]">
          <Filter className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />
          <select
            value={actorFilter}
            onChange={(e) => setActorFilter(e.target.value as "all" | "user" | "agent")}
            className="text-xs font-medium bg-transparent border-none text-[var(--color-text-secondary)] focus:outline-none cursor-pointer"
          >
            <option value="all">所有发起人</option>
            <option value="user">用户</option>
            <option value="agent">Agent</option>
          </select>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-bg-surface)] border border-[var(--color-border)]">
          <select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value)}
            className="text-xs font-medium bg-transparent border-none text-[var(--color-text-secondary)] focus:outline-none cursor-pointer"
          >
            <option value="all">所有类型</option>
            {uniqueKinds.map((k) => (
              <option key={k} value={k}>{getActionConfig(k).verb}</option>
            ))}
          </select>
        </div>

        {(actorFilter !== "all" || kindFilter !== "all") && (
          <button
            onClick={() => { setActorFilter("all"); setKindFilter("all"); }}
            className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-primary)]"
          >
            清除筛选
          </button>
        )}

        <div className="ml-auto flex items-center gap-4">
          {selected.size > 0 && (
            <span className="text-xs font-mono text-[var(--color-primary)]">
              已选 {selected.size} 条
            </span>
          )}
          <span className="text-xs font-mono text-[var(--color-text-tertiary)]">
            共 {filteredEntries.length} 条
          </span>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="py-12 text-center">
            <div className="w-8 h-8 mx-auto rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-primary)] animate-spin" />
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedEntries).map(([date, dayEntries]) => (
              <div key={date} className="space-y-3">
                {/* Sticky date header */}
                <div className="sticky top-0 z-10 py-2 bg-[var(--color-bg-canvas)] border-b border-[var(--color-border-subtle)]">
                  <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {date}
                  </h4>
                </div>

                <div className="space-y-1">
                  {dayEntries.map((entry) => {
                    const config = getActionConfig(entry.actionKind);
                    const ActionIcon = config.icon;

                    return (
                      <div
                        key={entry.id}
                        className="group flex items-center gap-4 px-3 py-3 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-subtle)] transition-colors cursor-pointer"
                        onClick={() => toggleSelect(entry.id)}
                      >
                        {/* Checkbox */}
                        <div className={`
                          w-4 h-4 rounded-[var(--radius-sm)] border flex items-center justify-center shrink-0
                          ${selected.has(entry.id)
                            ? "bg-[var(--color-primary)] border-[var(--color-primary)]"
                            : "border-[var(--color-border)] opacity-0 group-hover:opacity-100"
                          }
                        `}>
                          {selected.has(entry.id) && <Check className="w-3 h-3 text-white" />}
                        </div>

                        {/* Actor avatar */}
                        <div className="w-7 h-7 rounded-[var(--radius-sm)] bg-[var(--color-bg-surface)] border border-[var(--color-border)] flex items-center justify-center shrink-0">
                          {entry.actorType === "agent" ? (
                            <Bot className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                          ) : (
                            <span className="text-xs font-medium text-[var(--color-text-tertiary)]">我</span>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-[var(--color-text-primary)]">
                              {entry.actorType === "agent" ? "Agent" : "我"}
                            </span>
                            <span className="text-sm text-[var(--color-text-secondary)]">
                              · {config.verb}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)] font-mono mt-0.5">
                            <span>{entry.actionKind}</span>
                            {entry.targetId && (
                              <>
                                <span>·</span>
                                <span>{entry.targetId.slice(0, 8)}</span>
                              </>
                            )}
                            <span>·</span>
                            <span>{formatRelativeTime(new Date(entry.signedAt))}</span>
                          </div>
                        </div>

                        {/* Stamp Badge */}
                        <LedgerStampBadge
                          signature={entry.signature}
                          state={entry.anchorTxId ? "anchored" : "default"}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {filteredEntries.length === 0 && (
              <div className="py-12 text-center">
                <Receipt className="w-10 h-10 mx-auto text-[var(--color-text-tertiary)] mb-4" />
                <p className="text-sm text-[var(--color-text-secondary)]">
                  还没有 Ledger 记录
                </p>
                <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                  去 Studio 让 Agent 做点事，每一步都会自动落账。
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function LedgerPage() {
  return (
    <StudioShell>
      <Suspense fallback={<div className="p-8 text-center text-[var(--color-text-muted)]">Loading...</div>}>
        <LedgerPageContent />
      </Suspense>
    </StudioShell>
  );
}
