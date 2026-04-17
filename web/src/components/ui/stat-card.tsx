import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

export interface StatCardProps {
  label: React.ReactNode;
  value: React.ReactNode;
  /** Numeric delta versus reference period (e.g. +4.2) */
  delta?: number | null;
  /** Short suffix on value (e.g. %) */
  valueSuffix?: React.ReactNode;
  /** Reference period label shown next to delta */
  deltaLabel?: React.ReactNode;
  icon?: LucideIcon;
  /** Sparkline / chart slot */
  trend?: React.ReactNode;
  /** Invert delta colour semantics (e.g. report-queue where "up" is bad) */
  invertDelta?: boolean;
  className?: string;
}

function formatDelta(delta: number): string {
  const rounded = Math.round(delta * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded}%`;
}

export function StatCard({
  label,
  value,
  delta,
  valueSuffix,
  deltaLabel,
  icon: Icon,
  trend,
  invertDelta = false,
  className = "",
}: StatCardProps) {
  const hasDelta = delta !== null && delta !== undefined && !Number.isNaN(delta);
  const isPositive = hasDelta && delta! > 0;
  const isNegative = hasDelta && delta! < 0;
  const isZero = hasDelta && delta === 0;
  const good = invertDelta ? isNegative : isPositive;
  const bad = invertDelta ? isPositive : isNegative;

  const deltaColorClass = good
    ? "text-[var(--color-success)]"
    : bad
      ? "text-[var(--color-error)]"
      : "text-[var(--color-text-tertiary)]";

  const DeltaIcon = isZero
    ? Minus
    : isPositive
      ? ArrowUpRight
      : isNegative
        ? ArrowDownRight
        : Minus;

  return (
    <div
      className={[
        "rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4 flex flex-col gap-3",
        className,
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs text-[var(--color-text-tertiary)] uppercase tracking-[0.08em] font-mono">
          {label}
        </span>
        {Icon ? (
          <Icon className="w-4 h-4 text-[var(--color-text-tertiary)]" aria-hidden="true" />
        ) : null}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-[var(--color-text-primary)] tracking-tight">
          {value}
        </span>
        {valueSuffix ? (
          <span className="text-xs text-[var(--color-text-tertiary)]">{valueSuffix}</span>
        ) : null}
      </div>
      {hasDelta ? (
        <div className={["flex items-center gap-1.5 text-xs", deltaColorClass].join(" ")}>
          <DeltaIcon className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="font-mono">{formatDelta(delta!)}</span>
          {deltaLabel ? (
            <span className="text-[var(--color-text-tertiary)]">· {deltaLabel}</span>
          ) : null}
        </div>
      ) : null}
      {trend ? <div className="mt-1">{trend}</div> : null}
    </div>
  );
}
