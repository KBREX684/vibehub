import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { FloatingIcon } from "./floating-icon";

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
        "px-6 py-12",
        block ? "min-h-[50vh] justify-center" : "",
        className,
      ].join(" ")}
    >
      <div className="w-10 h-10 rounded-[var(--radius-lg)] flex items-center justify-center mb-4">
        <Icon className="w-10 h-10 text-[var(--color-text-tertiary)]" aria-hidden="true" strokeWidth={1.5} />
      </div>
      <h3 className="text-base font-semibold text-[var(--color-text-primary)] m-0 font-sans">
        {title}
      </h3>
      {description ? (
        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed max-w-[400px] mt-2 m-0">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
