import * as React from "react";

export type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "apple"
  | "violet"
  | "cyan"
  | "enterprise";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  /** Renders as a pill (full rounded) vs subtle rounded rect */
  pill?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  default:    "bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] border-[var(--color-border)]",
  success:    "bg-[var(--color-success-subtle)] text-[var(--color-success)] border-[rgba(52,211,153,0.25)]",
  warning:    "bg-[var(--color-warning-subtle)] text-[var(--color-warning)] border-[rgba(251,191,36,0.25)]",
  error:      "bg-[var(--color-error-subtle)] text-[var(--color-error)] border-[rgba(248,113,113,0.25)]",
  info:       "bg-[var(--color-info-subtle)] text-[var(--color-info)] border-[rgba(96,165,250,0.25)]",
  apple:      "bg-[var(--color-accent-apple-subtle)] text-[var(--color-accent-apple)] border-[rgba(0,113,227,0.25)]",
  violet:     "bg-[var(--color-accent-violet-subtle)] text-[var(--color-accent-violet)] border-[rgba(167,139,250,0.25)]",
  cyan:       "bg-[var(--color-accent-cyan-subtle)] text-[var(--color-accent-cyan)] border-[rgba(34,211,238,0.25)]",
  enterprise: "bg-[var(--color-enterprise-subtle)] text-[var(--color-enterprise)] border-[rgba(52,211,153,0.25)]",
};

export function Badge({
  variant = "default",
  pill = false,
  className = "",
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 border px-2 py-0.5 text-xs font-medium",
        pill ? "rounded-[var(--radius-pill)]" : "rounded-[var(--radius-sm)]",
        variantClasses[variant],
        className,
      ].join(" ")}
      {...rest}
    >
      {children}
    </span>
  );
}
