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
  mono?: boolean;
  size?: "sm" | "md";
}

const variantClasses: Record<BadgeVariant, string> = {
  default:    "bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] border-[var(--color-border)]",
  success:    "bg-[var(--color-success-subtle)] text-[var(--color-success)] border-[var(--color-success-border)]",
  warning:    "bg-[var(--color-warning-subtle)] text-[var(--color-warning)] border-[var(--color-warning-border)]",
  error:      "bg-[var(--color-error-subtle)] text-[var(--color-error)] border-[var(--color-error-border)]",
  info:       "bg-[var(--color-info-subtle)] text-[var(--color-info)] border-[var(--color-info-border)]",
  apple:      "bg-[var(--color-accent-apple-subtle)] text-[var(--color-accent-apple)] border-[var(--color-accent-apple-border)]",
  violet:     "bg-[var(--color-accent-violet-subtle)] text-[var(--color-accent-violet)] border-[var(--color-accent-violet-border)]",
  cyan:       "bg-[var(--color-accent-cyan-subtle)] text-[var(--color-accent-cyan)] border-[var(--color-accent-cyan-border)]",
  enterprise: "bg-[var(--color-enterprise-subtle)] text-[var(--color-enterprise)] border-[var(--color-enterprise-border)]",
};

export function Badge({
  variant = "default",
  pill = false,
  mono = false,
  size = "md",
  className = "",
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 border",
        mono ? "font-mono" : "font-medium",
        size === "sm" ? "px-2 py-0.5 text-[0.65rem]" : "px-2.5 py-0.5 text-xs",
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
