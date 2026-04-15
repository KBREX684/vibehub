"use client";

import * as React from "react";

export interface DropdownProps {
  /** Button or element that toggles the menu */
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "start" | "end";
}

/**
 * P1-FE-2: lightweight menu panel (no external deps). For keyboard/ARIA-heavy menus prefer upgrading to Radix later.
 */
export function Dropdown({ trigger, children, align = "start" }: DropdownProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface-hover)]"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        {trigger}
      </button>
      {open && (
        <div
          role="menu"
          className={[
            "absolute z-50 mt-1 min-w-[10rem] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] py-1 shadow-[var(--shadow-modal)]",
            align === "end" ? "right-0" : "left-0",
          ].join(" ")}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({
  children,
  onSelect,
  className = "",
}: {
  children: React.ReactNode;
  onSelect?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className={[
        "flex w-full items-center px-3 py-2 text-left text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface-hover)]",
        className,
      ].join(" ")}
      onClick={() => {
        onSelect?.();
      }}
    >
      {children}
    </button>
  );
}
