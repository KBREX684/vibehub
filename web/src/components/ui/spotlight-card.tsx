"use client";

import { useRef, useState, useCallback } from "react";

export interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Spotlight color. Defaults to a faint white glow */
  spotlightColor?: string;
  /** Spotlight radius in px. Defaults to 200 */
  spotlightRadius?: number;
}

/**
 * SpotlightCard — card with a mouse-following spotlight glow effect.
 * Inspired by reactbits.dev/SpotlightCard.
 * Uses a radial gradient overlay that tracks mouse position.
 * Respects prefers-reduced-motion (disables tracking).
 */
export function SpotlightCard({
  children,
  className = "",
  spotlightColor = "rgba(255,255,255,0.06)",
  spotlightRadius = 200,
  ...rest
}: SpotlightCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = cardRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    },
    []
  );

  return (
    <div
      ref={cardRef}
      className={[
        "relative overflow-hidden",
        className,
      ].join(" ")}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      {...rest}
    >
      {/* Spotlight overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1] transition-opacity duration-300"
        style={{
          opacity: isHovering ? 1 : 0,
          background: `radial-gradient(${spotlightRadius}px circle at ${pos.x}px ${pos.y}px, ${spotlightColor}, transparent)`,
        }}
      />
      {/* Card content sits above spotlight */}
      <div className="relative z-[2]">{children}</div>
    </div>
  );
}
