import * as React from "react";
import { AlertCircle } from "lucide-react";

export type ErrorBannerTone = "error" | "warning" | "info";

export interface ErrorBannerProps {
  tone?: ErrorBannerTone;
  children: React.ReactNode;
  className?: string;
}

const toneClass: Record<ErrorBannerTone, string> = {
  error:
    "text-[var(--color-error)] bg-[var(--color-error-subtle)] border-[var(--color-error-border)]",
  warning:
    "text-[var(--color-warning)] bg-[var(--color-warning-subtle)] border-[var(--color-warning-border)]",
  info:
    "text-[var(--color-info)] bg-[var(--color-info-subtle)] border-[var(--color-info-border)]",
};

/**
 * Inline banner for transient error / warning / info messages next to
 * forms and panels. Use this instead of hand-rolling the long-token
 * className combo that was repeated across settings / team / admin pages.
 */
export function ErrorBanner({
  tone = "error",
  children,
  className = "",
}: ErrorBannerProps) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={[
        "inline-flex items-center gap-2 text-xs rounded-[var(--radius-md)] border px-3 py-2 m-0",
        toneClass[tone],
        className,
      ].join(" ")}
    >
      <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
