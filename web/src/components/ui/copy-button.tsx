"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { useLanguage } from "@/app/context/LanguageContext";

export interface CopyButtonProps {
  value: string;
  /** Visible label (defaults to "复制"). Set to null for icon-only. */
  label?: React.ReactNode | null;
  /** Label shown after a successful copy (defaults to "已复制"). */
  copiedLabel?: React.ReactNode;
  /** Visual size. */
  size?: "sm" | "md";
  /** Optional extra class for wrapping element. */
  className?: string;
  /** Fired after a successful copy (useful for telemetry). */
  onCopied?: (value: string) => void;
}

const sizeClass: Record<NonNullable<CopyButtonProps["size"]>, string> = {
  sm: "px-2 py-1 text-[0.7rem] gap-1.5",
  md: "px-2.5 py-1.5 text-xs gap-1.5",
};

/**
 * Click-to-copy button with success state. Used throughout quick-start code
 * samples, shell commands, API keys (masked), MCP manifest URLs, etc.
 */
export function CopyButton({
  value,
  label,
  copiedLabel,
  size = "md",
  className = "",
  onCopied,
}: CopyButtonProps) {
  const { t } = useLanguage();
  const [copied, setCopied] = React.useState(false);
  const timeoutRef = React.useRef<number | null>(null);

  const handleCopy = React.useCallback(async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(value);
      } else {
        const temp = document.createElement("textarea");
        temp.value = value;
        temp.setAttribute("readonly", "");
        temp.style.position = "absolute";
        temp.style.left = "-9999px";
        document.body.appendChild(temp);
        temp.select();
        document.execCommand("copy");
        document.body.removeChild(temp);
      }
      setCopied(true);
      onCopied?.(value);
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }, [value, onCopied]);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const Icon = copied ? Check : Copy;

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-live="polite"
      className={[
        "inline-flex items-center font-medium rounded-[var(--radius-md)] border",
        "bg-transparent text-[var(--color-text-secondary)] border-[var(--color-border)]",
        "hover:bg-[var(--color-bg-surface-hover)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)]",
        "transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--color-bg-canvas)]",
        sizeClass[size],
        copied ? "text-[var(--color-success)] border-[var(--color-success-border)]" : "",
        className,
      ].join(" ")}
    >
      <Icon className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} aria-hidden="true" />
      {label !== null ? (
        <span>
          {copied
            ? copiedLabel ?? t("common.copied", "Copied")
            : label ?? t("common.copy", "Copy")}
        </span>
      ) : null}
    </button>
  );
}
