import * as React from "react";

export type TagPillAccent =
  | "default"
  | "apple"
  | "violet"
  | "cyan"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "enterprise";

export interface TagPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  accent?: TagPillAccent;
  /** Use monospace font (for slugs, technical labels, tags). */
  mono?: boolean;
  /** Smaller visual size. */
  size?: "sm" | "md";
}

const accentClass: Record<TagPillAccent, string> = {
  default:    "bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] border-[var(--color-border)]",
  apple:      "bg-[var(--color-accent-apple-subtle)] text-[var(--color-accent-apple)] border-[var(--color-accent-apple-border)]",
  violet:     "bg-[var(--color-accent-violet-subtle)] text-[var(--color-accent-violet)] border-[var(--color-accent-violet-border)]",
  cyan:       "bg-[var(--color-accent-cyan-subtle)] text-[var(--color-accent-cyan)] border-[var(--color-accent-cyan-border)]",
  success:    "bg-[var(--color-success-subtle)] text-[var(--color-success)] border-[var(--color-success-border)]",
  warning:    "bg-[var(--color-warning-subtle)] text-[var(--color-warning)] border-[var(--color-warning-border)]",
  error:      "bg-[var(--color-error-subtle)] text-[var(--color-error)] border-[var(--color-error-border)]",
  info:       "bg-[var(--color-info-subtle)] text-[var(--color-info)] border-[var(--color-info-border)]",
  enterprise: "bg-[var(--color-enterprise-subtle)] text-[var(--color-enterprise)] border-[var(--color-enterprise-border)]",
};

const sizeClass: Record<NonNullable<TagPillProps["size"]>, string> = {
  sm: "px-2 py-0.5 text-[0.65rem]",
  md: "px-2.5 py-0.5 text-xs",
};

/**
 * A pill-shaped tag for stack items, meta chips, technical labels, etc.
 * Prefer this over re-styling `Badge` when the use-case is a "tag list".
 */
export function TagPill({
  accent = "default",
  mono = false,
  size = "md",
  className = "",
  children,
  ...rest
}: TagPillProps) {
  return (
    <span
      {...rest}
      className={[
        "inline-flex items-center gap-1 border rounded-[var(--radius-pill)]",
        mono ? "font-mono" : "font-medium",
        sizeClass[size],
        accentClass[accent],
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}
