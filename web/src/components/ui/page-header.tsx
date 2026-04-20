import * as React from "react";
import type { LucideIcon } from "lucide-react";

export interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: LucideIcon;
  /** Right-aligned action slot (buttons, toolbar) */
  actions?: React.ReactNode;
  /** Optional eyebrow tag shown above title */
  eyebrow?: React.ReactNode;
  className?: string;
  /** Omit the bottom divider (useful when followed by a tab bar) */
  dense?: boolean;
}

export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  actions,
  eyebrow,
  className = "",
  dense = false,
}: PageHeaderProps) {
  return (
    <header
      className={[
        "flex flex-col sm:flex-row sm:items-center justify-between gap-4",
        dense ? "pb-3" : "pb-5 border-b border-[var(--color-border)]",
        className,
      ].join(" ")}
    >
      <div className="flex items-start sm:items-center gap-4 min-w-0">
        {Icon ? (
          <div className="shrink-0 w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--color-primary-subtle)] flex items-center justify-center text-[var(--color-text-primary)]">
            <Icon className="w-5 h-5" />
          </div>
        ) : null}
        <div className="min-w-0">
          {eyebrow ? (
            <div className="text-[0.7rem] uppercase tracking-[0.14em] font-mono text-[var(--color-text-tertiary)] mb-1">
              {eyebrow}
            </div>
          ) : null}
          <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--color-text-primary)] m-0 leading-tight text-balance break-words font-serif tracking-tight">
            {title}
          </h1>
          {subtitle ? (
            <p className="text-sm text-[var(--color-text-secondary)] mt-1 m-0 leading-relaxed">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
