"use client";

export interface FloatProps {
  children: React.ReactNode;
  /** Float distance in px. Defaults to 6 */
  distance?: number;
  /** Animation duration in seconds. Defaults to 3 */
  speed?: number;
  /** Extra CSS classes */
  className?: string;
}

/**
 * Float — gentle up/down floating animation.
 * Inspired by reactbits.dev/Float.
 * Pure CSS animation. Respects prefers-reduced-motion via CSS.
 */
export function Float({
  children,
  distance = 6,
  speed = 3,
  className = "",
}: FloatProps) {
  return (
    <div
      className={["float-animation", className].join(" ")}
      style={
        {
          "--float-distance": `${distance}px`,
          "--float-speed": `${speed}s`,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}
