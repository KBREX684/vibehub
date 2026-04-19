"use client";

import { useState, useEffect } from "react";
import { emitPmfEvent } from "@/lib/pmf-event";
import { isMockDataEnabled } from "@/lib/runtime-mode";

interface PmfMetric {
  value: number;
  target: number;
  trend7d: number[];
  trend30d: number[];
}

interface PmfDashboard {
  complianceEnabledRate: PmfMetric;
  monthlyLedgerExportRate: PmfMetric;
  proConversionRate: PmfMetric;
  asOf: string;
}

const MOCK_DASHBOARD: PmfDashboard = {
  complianceEnabledRate: {
    value: 0.72,
    target: 0.7,
    trend7d: [0.65, 0.68, 0.69, 0.70, 0.71, 0.71, 0.72],
    trend30d: Array.from({ length: 30 }, (_, i) => 0.5 + (i / 30) * 0.22 + Math.sin(i / 5) * 0.03),
  },
  monthlyLedgerExportRate: {
    value: 0.28,
    target: 0.3,
    trend7d: [0.22, 0.24, 0.25, 0.26, 0.27, 0.27, 0.28],
    trend30d: Array.from({ length: 30 }, (_, i) => 0.15 + (i / 30) * 0.13 + Math.sin(i / 4) * 0.02),
  },
  proConversionRate: {
    value: 0.04,
    target: 0.05,
    trend7d: [0.03, 0.032, 0.035, 0.036, 0.038, 0.039, 0.04],
    trend30d: Array.from({ length: 30 }, (_, i) => 0.02 + (i / 30) * 0.02 + Math.sin(i / 3) * 0.005),
  },
  asOf: new Date().toISOString(),
};

function statusColor(value: number, target: number): string {
  if (value >= target) return "var(--color-success)";
  if (value >= target * 0.5) return "var(--color-warning)";
  return "var(--color-error)";
}

function statusDot(value: number, target: number): string {
  if (value >= target) return "bg-[var(--color-success)]";
  if (value >= target * 0.5) return "bg-[var(--color-warning)]";
  return "bg-[var(--color-error)]";
}

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length === 0) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 100;
  const h = 24;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");

  return (
    <svg width={w} height={h} className="opacity-60">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        points={points}
      />
    </svg>
  );
}

const METRIC_CARDS: { key: keyof Omit<PmfDashboard, "asOf">; label: string; fmt: (v: number) => string }[] = [
  { key: "complianceEnabledRate", label: "合规启用率", fmt: (v) => `${(v * 100).toFixed(1)}%` },
  { key: "monthlyLedgerExportRate", label: "月度 Ledger 导出率", fmt: (v) => `${(v * 100).toFixed(1)}%` },
  { key: "proConversionRate", label: "Pro 转化率", fmt: (v) => `${(v * 100).toFixed(1)}%` },
];

export default function PmfDashboardPage() {
  const [data, setData] = useState<PmfDashboard>(MOCK_DASHBOARD);

  useEffect(() => {
    if (isMockDataEnabled()) {
      setData(MOCK_DASHBOARD);
      return;
    }
    fetch("/api/v1/admin/v11-pmf-dashboard")
      .then((r) => r.json())
      .then((json) => { if (json.data) setData(json.data); })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">V11 PMF Dashboard</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          三个北极星指标 — 同时满足 = PMF 通过
        </p>
      </div>

      {/* 3 metric cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {METRIC_CARDS.map(({ key, label, fmt }) => {
          const metric = data[key];
          const color = statusColor(metric.value, metric.target);
          const dotClass = statusDot(metric.value, metric.target);
          return (
            <div key={key} className="p-5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-surface)]">
              <div className="flex items-center gap-2 mb-3">
                <span className={`w-2.5 h-2.5 rounded-full ${dotClass}`} />
                <span className="text-sm font-medium text-[var(--color-text-secondary)]">{label}</span>
              </div>

              {/* Big number */}
              <p className="text-3xl font-bold tabular-nums mb-1" style={{ fontFamily: "var(--font-mono)", color }}>
                {fmt(metric.value)}
              </p>

              {/* Target */}
              <p className="text-xs text-[var(--color-text-muted)] mb-4">
                目标：{fmt(metric.target)}
              </p>

              {/* Sparklines */}
              <div className="space-y-2">
                <div>
                  <p className="text-[10px] font-mono text-[var(--color-text-muted)] mb-1">7 天趋势</p>
                  <MiniSparkline data={metric.trend7d} color={color} />
                </div>
                <div>
                  <p className="text-[10px] font-mono text-[var(--color-text-muted)] mb-1">30 天趋势</p>
                  <MiniSparkline data={metric.trend30d} color={color} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <p className="text-[10px] font-mono text-[var(--color-text-muted)]">
        最近刷新：{new Date(data.asOf).toLocaleString("zh-CN")}
      </p>
    </div>
  );
}
