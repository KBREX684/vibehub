"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { StudioShell } from "@/components/studio-shell";
import { LedgerTimeline } from "@/components/ledger-timeline";
import { LedgerExportDialog } from "@/components/ledger-export-dialog";
import { LegalAnchorCard } from "@/components/legal-anchor-card";
import { getMockLedgerEntries, type LedgerEntry } from "@/lib/data/mock-ledger";
import { mockFetch } from "@/lib/data/mock-v11-routes";
import { isMockDataEnabled } from "@/lib/runtime-mode";
import { useLanguage } from "@/app/context/LanguageContext";
import { Download, Filter, Anchor, X } from "lucide-react";
import { toast } from "sonner";

const WORKSPACE_ID = "ws_personal_alice";

function LedgerPageContent() {
  const { t } = useLanguage();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  // Filters
  const [actorFilter, setActorFilter] = useState<"all" | "user" | "agent">("all");
  const [kindFilter, setKindFilter] = useState<string>("all");

  // Selection + anchor
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [anchorDialog, setAnchorDialog] = useState<{
    open: boolean;
    entry: LedgerEntry | null;
  }>({ open: false, entry: null });
  const [anchoring, setAnchoring] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        if (isMockDataEnabled()) {
          const mock = await mockFetch<{ items: LedgerEntry[]; cursor: string | null }>(
            "GET",
            "/api/v1/me/ledger?limit=50"
          );
          if (mock?.data?.items) {
            setEntries(mock.data.items);
            setHasMore(!!mock.data.cursor);
          }
        } else {
          const res = await fetch("/api/v1/me/ledger?limit=50");
          const json = await res.json();
          if (json.items) {
            setEntries(json.items);
            setHasMore(!!json.cursor);
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

  const filteredEntries = entries.filter((e) => {
    if (actorFilter !== "all" && e.actorType !== actorFilter) return false;
    if (kindFilter !== "all" && e.actionKind !== kindFilter) return false;
    return true;
  });

  const handleLoadMore = useCallback(() => {
    setHasMore(false);
  }, []);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBatchAnchor(chain: "zhixin" | "baoquan") {
    const entryIds = Array.from(selected).filter((id) => {
      const entry = entries.find((e) => e.id === id);
      return entry && !entry.anchorTxId;
    });

    if (entryIds.length === 0) return;

    setAnchoring(true);
    try {
      if (isMockDataEnabled()) {
        const mock = await mockFetch<{ attested: Array<{ ledgerEntryId: string; txId: string; verifiedAt: string }> }>(
          "POST",
          `/api/v1/workspaces/${WORKSPACE_ID}/ledger/anchor`,
          { entryIds, chain }
        );

        if (mock && "error" in mock && (mock as { error: { code: string } }).error?.code === "PRO_REQUIRED") {
          toast.error(t("legal_anchor.upgrade_prompt", "锚定到司法链是 Pro 功能。"));
          return;
        }

        if (mock?.data?.attested) {
          setEntries((prev) =>
            prev.map((e) => {
              const attested = mock.data!.attested.find((a: { ledgerEntryId: string }) => a.ledgerEntryId === e.id);
              if (attested) {
                return { ...e, anchorChain: chain, anchorTxId: attested.txId, anchorVerifiedAt: attested.verifiedAt };
              }
              return e;
            })
          );
          toast.success(`已锚定 ${entryIds.length} 条到 ${chain === "zhixin" ? "至信链" : "保全网"}`);
        }
      } else {
        const res = await fetch(`/api/v1/workspaces/${WORKSPACE_ID}/ledger/anchor`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entryIds, chain }),
        });
        if (res.status === 403) {
          toast.error(t("legal_anchor.upgrade_prompt", "锚定到司法链是 Pro 功能。"));
          return;
        }
        const json = await res.json();
        if (json.data?.attested) {
          toast.success(`已锚定 ${entryIds.length} 条`);
        }
      }
    } catch {
      toast.error("锚定失败");
    } finally {
      setAnchoring(false);
      setSelected(new Set());
    }
  }

  function openAnchorDetail(entry: LedgerEntry) {
    setAnchorDialog({ open: true, entry });
  }

  const unanchoredSelected = Array.from(selected).filter((id) => {
    const entry = entries.find((e) => e.id === id);
    return entry && !entry.anchorTxId;
  }).length;

  const uniqueKinds = Array.from(new Set(entries.map((e) => e.actionKind)));

  return (
    <>
      <div className="px-4 py-3 border-b border-[var(--color-border)]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">
              {t("ledger.page_title", "Ledger")}
            </h1>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              {t("ledger.page_subtitle", "AI 操作公证账本")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setExportOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[var(--color-text-primary)] text-[var(--color-bg-canvas)] border border-[var(--color-text-primary)] rounded-[var(--radius-md)] hover:opacity-90 transition-opacity"
          >
            <Download className="w-3.5 h-3.5" />
            {t("ledger.export_button", "导出")}
          </button>
        </div>
      </div>

      {/* Batch action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-[var(--color-accent-apple-subtle)] border-b border-[var(--color-accent-apple-border)]">
          <span className="text-xs font-mono text-[var(--color-accent-apple)]">
            已选 {selected.size} 条
            {unanchoredSelected > 0 && `（${unanchoredSelected} 条未锚定）`}
          </span>
          <div className="flex gap-2 ml-auto">
            {unanchoredSelected > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => handleBatchAnchor("zhixin")}
                  disabled={anchoring}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono rounded-[var(--radius-sm)] bg-[var(--color-accent-apple)] text-[var(--color-on-accent)] hover:opacity-90 disabled:opacity-50"
                >
                  <Anchor className="w-3 h-3" />
                  锚定 {unanchoredSelected} 条 → 至信链
                </button>
                <button
                  type="button"
                  onClick={() => handleBatchAnchor("baoquan")}
                  disabled={anchoring}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono rounded-[var(--radius-sm)] border border-[var(--color-accent-apple)] text-[var(--color-accent-apple)] hover:bg-[var(--color-accent-apple-subtle)] disabled:opacity-50"
                >
                  <Anchor className="w-3 h-3" />
                  保全网
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg-canvas)]">
        <Filter className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
        <select
          value={actorFilter}
          onChange={(e) => setActorFilter(e.target.value as "all" | "user" | "agent")}
          className="text-xs font-mono bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-[var(--radius-sm)] px-2 py-1 text-[var(--color-text-secondary)]"
        >
          <option value="all">全部 Actor</option>
          <option value="user">用户</option>
          <option value="agent">Agent</option>
        </select>
        <select
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value)}
          className="text-xs font-mono bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-[var(--radius-sm)] px-2 py-1 text-[var(--color-text-secondary)] max-w-[240px]"
        >
          <option value="all">全部类型</option>
          {uniqueKinds.map((k) => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
        <span className="text-[10px] font-mono text-[var(--color-text-muted)] ml-auto">
          {filteredEntries.length} 条
        </span>
      </div>

      {/* Timeline with selection */}
      <div className="p-4">
        {loading ? (
          <div className="py-12 text-center text-[var(--color-text-muted)] text-sm">加载中...</div>
        ) : (
          <div className="space-y-1">
            {filteredEntries.map((entry) => (
              <div key={entry.id} className="group relative">
                {/* Selection checkbox */}
                <button
                  type="button"
                  onClick={() => toggleSelect(entry.id)}
                  className={`absolute left-0 top-3 z-10 w-4 h-4 rounded-[2px] border transition-colors ${
                    selected.has(entry.id)
                      ? "bg-[var(--color-accent-apple)] border-[var(--color-accent-apple)]"
                      : "border-[var(--color-border)] hover:border-[var(--color-border-strong)] opacity-0 group-hover:opacity-100"
                  }`}
                >
                  {selected.has(entry.id) && (
                    <svg viewBox="0 0 16 16" className="w-full h-full text-white" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 8.5L6.5 12L13 4" />
                    </svg>
                  )}
                </button>

                {/* Anchor button (unanchored entries only) */}
                {!entry.anchorTxId && (
                  <button
                    type="button"
                    onClick={() => openAnchorDetail(entry)}
                    className="absolute right-0 top-3 z-10 px-2 py-0.5 text-[10px] font-mono text-[var(--color-text-muted)] rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] opacity-0 group-hover:opacity-100 hover:text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)] transition-all"
                  >
                    <Anchor className="w-3 h-3 inline-block mr-1" />
                    锚定
                  </button>
                )}

                <div className="pl-6">
                  {/* Simplified entry display with clickable stamp badge */}
                  <div className="flex items-center gap-3 py-2">
                    <span className="text-xs text-[var(--color-text-muted)] font-mono shrink-0">
                      {new Date(entry.signedAt).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="text-sm text-[var(--color-text-secondary)] truncate">
                      {entry.actorType === "agent" ? "Agent" : "你"} · {entry.actionKind.split(".").pop()}
                    </span>
                    <span className="ml-auto">
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={() => openAnchorDetail(entry)}
                        onKeyDown={(e) => { if (e.key === "Enter") openAnchorDetail(entry); }}
                      >
                        {/* Inline stamp badge */}
                        <span
                          className="inline-flex items-center gap-1 border rounded-[var(--radius-sm)] px-1.5 py-0.5 cursor-pointer select-none"
                          style={{
                            borderStyle: "dashed",
                            borderWidth: "1px",
                            borderColor: entry.anchorTxId ? "var(--color-success)" : "var(--color-border-strong)",
                            color: entry.anchorTxId ? "var(--color-success)" : "var(--color-text-tertiary)",
                            fontFamily: "var(--font-mono)",
                            fontSize: "11px",
                          }}
                        >
                          #{entry.signature.slice(0, 8)}·{entry.signature.slice(-2)}
                        </span>
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {filteredEntries.length === 0 && (
              <div className="py-12 text-center text-[var(--color-text-muted)] text-sm">
                还没有 Ledger 记录。去 Studio 做点事吧。
              </div>
            )}
          </div>
        )}
      </div>

      {/* Export dialog */}
      <LedgerExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        workspaceId={WORKSPACE_ID}
      />

      {/* Anchor detail dialog */}
      <LegalAnchorCard
        open={anchorDialog.open}
        onClose={() => setAnchorDialog({ open: false, entry: null })}
        anchor={
          anchorDialog.entry?.anchorTxId
            ? {
                chain: anchorDialog.entry.anchorChain as "zhixin" | "baoquan",
                txId: anchorDialog.entry.anchorTxId,
                verifiedAt: anchorDialog.entry.anchorVerifiedAt!,
                proofUrl: null,
              }
            : null
        }
        isFreeUser={!anchorDialog.entry?.anchorTxId}
      />
    </>
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
