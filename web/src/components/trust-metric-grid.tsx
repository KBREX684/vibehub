"use client";

/**
 * TrustMetricGrid — 3x2 grid of 6 Trust metrics.
 *
 * Each card: 48px Geist Mono number + title + description.
 * Zero displays as "—". Mobile: 2x3.
 */

import type { OpcTrustMetric } from "@/lib/data/mock-trust-card";
import { useLanguage } from "@/app/context/LanguageContext";

interface TrustMetricGridProps {
  metrics: OpcTrustMetric;
}

interface MetricDef {
  key: keyof OpcTrustMetric;
  titleKey: string;
  descKey: string;
  fallbackTitle: string;
  fallbackDesc: string;
  format: (v: number | null) => string;
}

const METRICS: MetricDef[] = [
  {
    key: "ledgerEntryCount",
    titleKey: "trust.metrics.ledger",
    descKey: "trust.metrics.ledger.desc",
    fallbackTitle: "Ledger 条数",
    fallbackDesc: "累计可校验操作",
    format: (v) => v === 0 ? "—" : String(v),
  },
  {
    key: "snapshotCount",
    titleKey: "trust.metrics.snapshot",
    descKey: "trust.metrics.snapshot.desc",
    fallbackTitle: "快照数",
    fallbackDesc: "可回滚交付单元",
    format: (v) => v === 0 ? "—" : String(v),
  },
  {
    key: "stampedArtifactCount",
    titleKey: "trust.metrics.stamp",
    descKey: "trust.metrics.stamp.desc",
    fallbackTitle: "已加标产物",
    fallbackDesc: "GB 45438-2025 合规",
    format: (v) => v === 0 ? "—" : String(v),
  },
  {
    key: "publicWorkCount",
    titleKey: "trust.metrics.works",
    descKey: "trust.metrics.works.desc",
    fallbackTitle: "公开作品",
    fallbackDesc: "可被发现",
    format: (v) => v === 0 ? "—" : String(v),
  },
  {
    key: "avgResponseHours",
    titleKey: "trust.metrics.response",
    descKey: "trust.metrics.response.desc",
    fallbackTitle: "平均响应时长",
    fallbackDesc: "（小时）",
    format: (v) => v === null || v === 0 ? "—" : `${v}h`,
  },
  {
    key: "registrationDays",
    titleKey: "trust.metrics.days",
    descKey: "trust.metrics.days.desc",
    fallbackTitle: "活跃天数",
    fallbackDesc: "在 VibeHub",
    format: (v) => v === 0 ? "—" : String(v),
  },
];

export function TrustMetricGrid({ metrics }: TrustMetricGridProps) {
  const { t } = useLanguage();

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {METRICS.map((def) => {
        const value = metrics[def.key] as number | null;
        return (
          <div
            key={def.key}
            className="p-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-surface)]"
          >
            <p
              className="text-[28px] md:text-[36px] font-bold tabular-nums text-[var(--color-text-primary)] leading-none mb-2"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {def.format(value)}
            </p>
            <p className="text-sm text-[var(--color-text-secondary)] mb-0.5">
              {t(def.titleKey, def.fallbackTitle)}
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              {t(def.descKey, def.fallbackDesc)}
            </p>
          </div>
        );
      })}
    </div>
  );
}
