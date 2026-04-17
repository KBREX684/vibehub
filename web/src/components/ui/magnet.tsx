"use client";

import { useRef, useState, useCallback, useEffect } from "react";

export interface MagnetProps {
  children: React.ReactNode;
  /** Magnetic pull strength in pixels. Defaults to 8 */
  strength?: number;
  /** Extra CSS classes */
  className?: string;
}

/**
 * Magnet — element subtly follows the cursor when nearby.
 * Inspired by reactbits.dev/Magnet.
 * Respects prefers-reduced-motion.
 */
export function Magnet({
  children,
  strength = 8,
  className = "",
}: MagnetProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [reducedMotion, setReducedMotion] = useState(false);
  const [coarsePointer, setCoarsePointer] = useState(false);

  useEffect(() => {
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setCoarsePointer(window.matchMedia("(hover: none), (pointer: coarse)").matches);
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (reducedMotion || coarsePointer) return;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);
      setOffset({ x: dx * strength, y: dy * strength });
    },
    [strength, reducedMotion, coarsePointer]
  );

  const handleMouseLeave = useCallback(() => {
    setOffset({ x: 0, y: 0 });
  }, []);

  return (
    <div
      ref={ref}
      className={["inline-block", className].join(" ")}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `translate(${offset.x}px, ${offset.y}px)`,
        transition: "transform 0.2s cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      {children}
    </div>
  );
}
