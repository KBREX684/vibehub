"use client";

import * as React from "react";

export interface TrustMetricCardProps {
  value: number | string | null;
  label: string;
  description?: string;
  className?: string;
}

export function TrustMetricCard({
  value,
  label,
  description,
  className = "",
}: TrustMetricCardProps) {
  // Display "—" for zero/null values instead of "0"
  const displayValue = value === null || value === 0 || value === "0"
    ? "—"
    : typeof value === "number"
      ? value.toLocaleString("zh-CN")
      : value;

  return (
    <div
      className={[
        "bg-[var(--color-bg-elevated)] rounded-[var(--radius-lg)] p-6",
        "shadow-[var(--shadow-card)]",
        "flex flex-col items-center text-center",
        "transition-all duration-200 ease-[cubic-bezier(0,0,0.2,1)]",
        "hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-[1px]",
        className,
      ].join(" ")}
    >
      <span
        className="font-mono text-[48px] font-medium leading-none text-[var(--color-text-primary)]"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {displayValue}
      </span>
      <span className="mt-2 text-sm font-medium text-[var(--color-text-primary)]">
        {label}
      </span>
      {description && (
        <span className="mt-1 text-xs text-[var(--color-text-secondary)]">
          {description}
        </span>
      )}
    </div>
  );
}

export interface TrustMetricGridProps {
  metrics: Array<{
    value: number | string | null;
    label: string;
    description?: string;
  }>;
  className?: string;
}

export function TrustMetricGrid({ metrics, className = "" }: TrustMetricGridProps) {
  return (
    <div className={["grid grid-cols-2 md:grid-cols-3 gap-4", className].join(" ")}>
      {metrics.map((metric, index) => (
        <TrustMetricCard
          key={index}
          value={metric.value}
          label={metric.label}
          description={metric.description}
        />
      ))}
    </div>
  );
}
