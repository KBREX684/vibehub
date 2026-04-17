"use client";

export interface GradientTextProps {
  children: React.ReactNode;
  /** CSS gradient string. Defaults to brand cyan → violet gradient */
  gradient?: string;
  /** Extra CSS classes */
  className?: string;
  /** Animate the gradient position. Defaults to true */
  animate?: boolean;
  /** Animation speed in seconds. Defaults to 4 */
  speed?: number;
}

/**
 * GradientText — animated gradient-colored text.
 * Inspired by reactbits.dev/GradientText.
 * Pure CSS animation with background-clip: text.
 */
export function GradientText({
  children,
  gradient,
  className = "",
  animate = true,
  speed = 4,
}: GradientTextProps) {
  const bg =
    gradient ??
    "linear-gradient(135deg, var(--color-accent-cyan), var(--color-accent-violet), var(--color-accent-apple), var(--color-accent-cyan))";

  return (
    <span
      className={["gradient-text", animate ? "gradient-text-animate" : "", className].join(" ")}
      style={
        {
          backgroundImage: bg,
          backgroundSize: animate ? "300% 300%" : "100% 100%",
          "--gradient-speed": `${speed}s`,
        } as React.CSSProperties
      }
    >
      {children}
    </span>
  );
}
