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
  apple:      "bg-[var(--color-accent-apple-subtle)] text-[var(--color-accent-apple)] border-[rgba(0,113,227,0.25)]",
  violet:     "bg-[var(--color-accent-violet-subtle)] text-[var(--color-accent-violet)] border-[rgba(167,139,250,0.25)]",
  cyan:       "bg-[var(--color-accent-cyan-subtle)] text-[var(--color-accent-cyan)] border-[rgba(34,211,238,0.25)]",
  success:    "bg-[var(--color-success-subtle)] text-[var(--color-success)] border-[rgba(52,211,153,0.25)]",
  warning:    "bg-[var(--color-warning-subtle)] text-[var(--color-warning)] border-[rgba(251,191,36,0.25)]",
  error:      "bg-[var(--color-error-subtle)] text-[var(--color-error)] border-[rgba(248,113,113,0.25)]",
  info:       "bg-[var(--color-info-subtle)] text-[var(--color-info)] border-[rgba(96,165,250,0.25)]",
  enterprise: "bg-[var(--color-enterprise-subtle)] text-[var(--color-enterprise)] border-[rgba(52,211,153,0.25)]",
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
