"use client";

export interface ShinyTextProps {
  children: React.ReactNode;
  /** Extra CSS classes */
  className?: string;
  /** Animation speed in seconds. Defaults to 3 */
  speed?: number;
}

/**
 * ShinyText — a flowing shimmer/shine effect across text.
 * Inspired by reactbits.dev/ShinyText.
 * Uses a CSS gradient mask animation. Zero JS overhead.
 */
export function ShinyText({
  children,
  className = "",
  speed = 3,
}: ShinyTextProps) {
  return (
    <span
      className={["shiny-text", className].join(" ")}
      style={
        {
          "--shiny-speed": `${speed}s`,
        } as React.CSSProperties
      }
    >
      {children}
    </span>
  );
}
