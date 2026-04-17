"use client";

import { useRef, useCallback } from "react";

export interface ClickSparkProps {
  children: React.ReactNode;
  /** Spark color. Defaults to accent-cyan token */
  color?: string;
  /** Number of particles. Defaults to 8 */
  count?: number;
  /** Extra CSS classes */
  className?: string;
}

/**
 * ClickSpark — burst particles on click.
 * Inspired by reactbits.dev/ClickSpark.
 * Creates ephemeral <span> particles that self-clean.
 * Respects prefers-reduced-motion.
 */
export function ClickSpark({
  children,
  color = "var(--color-accent-cyan)",
  count = 8,
  className = "",
}: ClickSparkProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const spark = useCallback(
    (e: React.MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      for (let i = 0; i < count; i++) {
        const dot = document.createElement("span");
        dot.className = "click-spark-particle";
        const angle = (Math.PI * 2 * i) / count;
        const distance = 20 + Math.random() * 20;
        dot.style.cssText = `
          position:absolute;left:${x}px;top:${y}px;width:4px;height:4px;
          border-radius:50%;background:${color};pointer-events:none;z-index:50;
          transform:translate(-50%,-50%);
          animation:click-spark-fly 0.5s cubic-bezier(0.22,1,0.36,1) forwards;
          --spark-x:${Math.cos(angle) * distance}px;
          --spark-y:${Math.sin(angle) * distance}px;
        `;
        el.appendChild(dot);
        setTimeout(() => dot.remove(), 600);
      }
    },
    [color, count]
  );

  return (
    <div
      ref={containerRef}
      className={["relative inline-flex", className].join(" ")}
      onClick={spark}
    >
      {children}
    </div>
  );
}
