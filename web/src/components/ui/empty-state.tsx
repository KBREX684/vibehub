import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  /** Fill the parent container vertically */
  block?: boolean;
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  block = false,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={[
        "flex flex-col items-center text-center",
        "px-6 py-10",
        block ? "min-h-[50vh] justify-center" : "",
        className,
      ].join(" ")}
    >
      <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] flex items-center justify-center mb-4">
        <Icon className="w-5 h-5 text-[var(--color-text-tertiary)]" aria-hidden="true" />
      </div>
      <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] m-0">
        {title}
      </h3>
      {description ? (
        <p className="text-xs text-[var(--color-text-tertiary)] leading-relaxed max-w-[360px] mt-2 m-0">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
