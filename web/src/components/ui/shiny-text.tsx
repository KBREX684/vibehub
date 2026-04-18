"use client";

export interface ShinyTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
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
  style,
  ...rest
}: ShinyTextProps) {
  return (
    <span
      {...rest}
      className={["shiny-text", className].join(" ")}
      style={
        {
          "--shiny-speed": `${speed}s`,
          ...style,
        } as React.CSSProperties
      }
    >
      {children}
    </span>
  );
}
