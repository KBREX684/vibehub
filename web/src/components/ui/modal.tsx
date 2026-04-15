"use client";

import * as React from "react";
import { X } from "lucide-react";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** `sm` ~400 px, `md` ~560 px (default), `lg` ~720 px */
  size?: "sm" | "md" | "lg";
  /** Accessible title (also rendered as the visible header when provided) */
  title?: string;
  children: React.ReactNode;
  /** Extra class applied to the panel container */
  className?: string;
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
} as const;

export function Modal({ open, onClose, size = "md", title, children, className = "" }: ModalProps) {
  // Keyboard: close on Escape
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Lock body scroll while modal is open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Focus trap: return focus to trigger on close
  const panelRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (open) {
      const first = panelRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      first?.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={[
          "relative w-full rounded-[var(--radius-2xl)] border border-[var(--color-border-strong)]",
          "bg-[var(--color-bg-elevated)] shadow-[var(--shadow-modal)]",
          "overflow-hidden",
          sizeClasses[size],
          className,
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)] m-0">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)] transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {!title && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)] transition-colors z-10"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
