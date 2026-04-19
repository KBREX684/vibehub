"use client";

/**
 * AigcStampToggle — v11 compliance settings toggle.
 *
 * Built on SectionCard. Shows:
 * - Toggle switch + title + subtitle
 * - Coverage badge (mono number, color-coded)
 * - Warning bar (when disabled)
 * - Provider radio (local/tencent/aliyun)
 */

import { useState } from "react";
import { SectionCard } from "@/components/ui/section-card";
import type { ComplianceSettings } from "@/lib/data/mock-persist";
import { emitPmfEvent } from "@/lib/pmf-event";

interface AigcStampToggleProps {
  settings: ComplianceSettings;
  /** AIGC stamp coverage percentage (0-100). */
  coveragePct: number;
  /** Called when settings change (auto-saves). */
  onChange: (next: ComplianceSettings) => Promise<void>;
}

const PROVIDER_OPTIONS: { value: ComplianceSettings["aigcProvider"]; label: string }[] = [
  { value: "local", label: "本地模式" },
  { value: "tencent", label: "腾讯云" },
  { value: "aliyun", label: "阿里云" },
];

function coverageColor(pct: number): string {
  if (pct >= 99) return "var(--color-success)";
  if (pct >= 80) return "var(--color-warning)";
  return "var(--color-error)";
}

export function AigcStampToggle({ settings, coveragePct, onChange }: AigcStampToggleProps) {
  const [saving, setSaving] = useState(false);

  async function handleToggle() {
    const next = { ...settings, aigcAutoStamp: !settings.aigcAutoStamp };
    setSaving(true);
    try {
      await onChange(next);
      if (next.aigcAutoStamp) emitPmfEvent("compliance.enabled");
    } finally {
      setSaving(false);
    }
  }

  async function handleProviderChange(provider: ComplianceSettings["aigcProvider"]) {
    setSaving(true);
    try {
      await onChange({ ...settings, aigcProvider: provider });
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard
      title="AIGC 自动加标"
      description="GB 45438-2025 合规"
      actions={
        <button
          type="button"
          role="switch"
          aria-checked={settings.aigcAutoStamp}
          onClick={handleToggle}
          disabled={saving}
          className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border border-[var(--color-border-strong)] transition-colors disabled:opacity-50"
          style={{ backgroundColor: settings.aigcAutoStamp ? "var(--color-accent-apple)" : "var(--color-bg-elevated)" }}
        >
          <span
            className="pointer-events-none inline-block h-5 w-5 rounded-full bg-[var(--color-text-primary)] shadow transition-transform"
            style={{ transform: settings.aigcAutoStamp ? "translateX(22px)" : "translateX(1px)", marginTop: "1px" }}
          />
        </button>
      }
    >
      <div className="space-y-4">
        {/* Coverage badge */}
        <div className="flex items-center gap-3">
          <span
            className="text-3xl font-bold tabular-nums"
            style={{ fontFamily: "var(--font-mono)", color: coverageColor(coveragePct) }}
          >
            {coveragePct}%
          </span>
          <span className="text-sm text-[var(--color-text-secondary)]">
            AIGC 标识覆盖率
          </span>
        </div>

        {/* Warning bar (when disabled) */}
        {!settings.aigcAutoStamp && (
          <div className="rounded-[var(--radius-md)] bg-[var(--color-warning-subtle)] border border-[var(--color-warning-border)] p-3">
            <p className="text-sm text-[var(--color-warning)] m-0">
              关闭后，新生成内容将不自动添加合规标识，可能违反国家相关规定。
            </p>
          </div>
        )}

        {/* Provider radio */}
        <div className="space-y-2">
          <p className="text-xs text-[var(--color-text-muted)] m-0">标识服务提供商</p>
          <div className="flex gap-2">
            {PROVIDER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleProviderChange(opt.value)}
                disabled={saving}
                className="px-3 py-1.5 text-xs font-mono rounded-[var(--radius-md)] border transition-colors disabled:opacity-50"
                style={{
                  borderColor: settings.aigcProvider === opt.value ? "var(--color-accent-apple)" : "var(--color-border)",
                  backgroundColor: settings.aigcProvider === opt.value ? "var(--color-accent-apple-subtle)" : "transparent",
                  color: settings.aigcProvider === opt.value ? "var(--color-accent-apple)" : "var(--color-text-secondary)",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
