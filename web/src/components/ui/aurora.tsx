"use client";

import { useEffect, useRef } from "react";

export interface AuroraProps {
  /** Primary color — defaults to accent-cyan token */
  colorPrimary?: string;
  /** Secondary color — defaults to accent-violet token */
  colorSecondary?: string;
  /** Overall opacity (0–1). Defaults to 0.3 */
  opacity?: number;
  /** Extra CSS classes on the container */
  className?: string;
  /** Animation speed multiplier (1 = normal). Defaults to 1 */
  speed?: number;
}

/**
 * Aurora — animated gradient background inspired by reactbits.dev/Aurora.
 * Uses CSS animations only (no canvas/WebGL) for zero-JS-overhead rendering.
 * Respects `prefers-reduced-motion` automatically.
 */
export function Aurora({
  colorPrimary,
  colorSecondary,
  opacity = 0.3,
  className = "",
  speed = 1,
}: AuroraProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.style.setProperty("--aurora-speed", `${8 / speed}s`);
  }, [speed]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={[
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      ].join(" ")}
      style={{ opacity }}
    >
      <div
        className="aurora-blob aurora-blob-1"
        style={{
          background: `radial-gradient(circle at center, ${colorPrimary ?? "var(--color-accent-cyan)"} 0%, transparent 70%)`,
        }}
      />
      <div
        className="aurora-blob aurora-blob-2"
        style={{
          background: `radial-gradient(circle at center, ${colorSecondary ?? "var(--color-accent-violet)"} 0%, transparent 70%)`,
        }}
      />
      <div
        className="aurora-blob aurora-blob-3"
        style={{
          background: `radial-gradient(circle at center, ${colorPrimary ?? "var(--color-accent-cyan)"} 0%, transparent 70%)`,
        }}
      />
    </div>
  );
}
