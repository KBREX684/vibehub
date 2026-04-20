"use client";

/**
 * StudioTopBar — Top bar for the /studio page.
 *
 * Shows: Workspace name + metric chips (Ledger count, AIGC coverage) + storage + "New" button.
 */

import { useLanguage } from "@/app/context/LanguageContext";
import { Plus } from "lucide-react";
import Link from "next/link";

interface StudioTopBarProps {
  /** Monthly Ledger entry count. */
  monthlyLedgerCount?: number;
  /** AIGC stamp coverage percentage (0-100). */
  aigcStampCoveragePct?: number;
  /** Storage used in GB. */
  storageUsedGb?: number;
  /** Storage limit in GB. */
  storageLimitGb?: number;
}

export function StudioTopBar({
  monthlyLedgerCount = 348,
  aigcStampCoveragePct = 100,
  storageUsedGb = 12.7,
  storageLimitGb = 20,
}: StudioTopBarProps) {
  const { t } = useLanguage();

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-canvas)]">
      {/* Left: workspace name */}
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-semibold text-[var(--color-text-primary)]">
          {t("studio.workspace_name", "我的工作站")}
        </h1>
      </div>

      {/* Right: metrics + storage + new */}
      <div className="flex items-center gap-3">
        {/* Metric chips */}
        <div className="hidden md:flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-[var(--radius-sm)] bg-[var(--color-bg-surface)] border border-[var(--color-border)] text-[11px] font-mono text-[var(--color-text-secondary)]">
            <span className="text-[var(--color-text-muted)]">Ledger</span>
            <span className="text-[var(--color-accent-apple)]">{monthlyLedgerCount}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-[var(--radius-sm)] bg-[var(--color-bg-surface)] border border-[var(--color-border)] text-[11px] font-mono text-[var(--color-text-secondary)]">
            <span className="text-[var(--color-text-muted)]">AIGC</span>
            <span className="text-[var(--color-success)]">{aigcStampCoveragePct}%</span>
          </span>
        </div>

        {/* Storage */}
        <span className="hidden sm:inline text-[11px] font-mono text-[var(--color-text-muted)]">
          {storageUsedGb}/{storageLimitGb} GB
        </span>

        {/* New button */}
        <Link
          href="/studio"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-[var(--color-on-accent)] text-xs font-semibold border border-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] hover:border-[var(--color-primary-hover)] active:scale-[0.98] transition-all duration-150"
        >
          <Plus className="w-3.5 h-3.5" />
          {t("studio.new", "新建")}
        </Link>
      </div>
    </div>
  );
}
