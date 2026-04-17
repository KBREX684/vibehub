import * as React from "react";
import type { LucideIcon } from "lucide-react";

export interface SectionCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Section title (rendered as h2/h3). */
  title: React.ReactNode;
  /** Muted description under the title. */
  description?: React.ReactNode;
  icon?: LucideIcon;
  /** Trailing actions (right aligned in the header). */
  actions?: React.ReactNode;
  /** Footer content (rendered below a divider). */
  footer?: React.ReactNode;
  /** Use an elevated (darker) surface. */
  elevated?: boolean;
  /** Heading level (defaults to 2). */
  level?: 2 | 3;
  /** Body padding preset. */
  padding?: "sm" | "md" | "lg";
}

const paddingClass: Record<NonNullable<SectionCardProps["padding"]>, string> = {
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

/**
 * Standard "section" surface for settings pages, admin panels and anywhere
 * a titled content block is needed. Pair with `FormField` or `DataTable`
 * to get consistent page structure.
 */
export function SectionCard({
  title,
  description,
  icon: Icon,
  actions,
  footer,
  elevated = false,
  level = 2,
  padding = "md",
  className = "",
  children,
  ...rest
}: SectionCardProps) {
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <section
      {...rest}
      className={[
        "rounded-[var(--radius-lg)] border border-[var(--color-border)]",
        elevated
          ? "bg-[var(--color-bg-elevated)]"
          : "bg-[var(--color-bg-surface)]",
        className,
      ].join(" ")}
    >
      <header className={["flex items-start justify-between gap-3 border-b border-[var(--color-border)]", paddingClass[padding]].join(" ")}>
        <div className="flex items-start gap-3 min-w-0">
          {Icon ? (
            <div className="shrink-0 w-8 h-8 rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] flex items-center justify-center text-[var(--color-text-secondary)] mt-0.5">
              <Icon className="w-4 h-4" />
            </div>
          ) : null}
          <div className="min-w-0">
            <Heading className="text-sm font-semibold text-[var(--color-text-primary)] m-0 leading-tight">
              {title}
            </Heading>
            {description ? (
              <p className="text-xs text-[var(--color-text-tertiary)] leading-relaxed m-0 mt-1">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        {actions ? (
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        ) : null}
      </header>
      <div className={paddingClass[padding]}>{children}</div>
      {footer ? (
        <footer className={["border-t border-[var(--color-border)]", paddingClass[padding]].join(" ")}>
          {footer}
        </footer>
      ) : null}
    </section>
  );
}
