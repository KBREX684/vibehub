import * as React from "react";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";
export type AvatarTone = "primary" | "violet" | "cyan" | "apple" | "neutral";

export interface AvatarProps {
  /** Optional image URL. When provided, it overrides the initial fallback. */
  src?: string | null;
  /** Alt text (also used to derive initial when `initial` is not provided). */
  alt?: string;
  /** Explicit single-character fallback. Falls back to first char of `alt`. */
  initial?: string;
  size?: AvatarSize;
  tone?: AvatarTone;
  /** Render as a rounded square instead of a circle. */
  square?: boolean;
  className?: string;
}

const sizeClass: Record<AvatarSize, string> = {
  xs: "w-5 h-5 text-[10px]",
  sm: "w-6 h-6 text-xs",
  md: "w-8 h-8 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-24 h-24 text-2xl",
};

/**
 * Gradient pairs are all token-driven. Keep the list tight — adding a new
 * tone should be a design-system decision, not a per-page one.
 */
const toneGradient: Record<AvatarTone, string> = {
  primary:
    "bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent-cyan)]",
  violet:
    "bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent-violet)]",
  cyan:
    "bg-gradient-to-br from-[var(--color-accent-cyan-subtle)] to-[var(--color-accent-cyan)]",
  apple:
    "bg-gradient-to-br from-[var(--color-accent-apple-subtle)] to-[var(--color-accent-apple)]",
  neutral:
    "bg-gradient-to-br from-[var(--color-bg-elevated)] to-[var(--color-bg-surface-hover)]",
};

/**
 * Unified avatar primitive. Use this instead of hand-rolling
 * "gradient circle with a centered letter" — there are already 6+ such
 * re-implementations across pages.
 */
export function Avatar({
  src,
  alt = "",
  initial,
  size = "md",
  tone = "primary",
  square = false,
  className = "",
}: AvatarProps) {
  const letter = (initial ?? alt?.charAt(0) ?? "?").toUpperCase();
  const shape = square ? "rounded-[var(--radius-md)]" : "rounded-[var(--radius-md)]";
  const fg = tone === "neutral"
    ? "text-[var(--color-text-primary)]"
    : "text-[var(--color-on-accent)]";

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={[
          "inline-flex items-center justify-center overflow-hidden object-cover border border-[var(--color-border-subtle)]",
          shape,
          sizeClass[size],
          className,
        ].join(" ")}
      />
    );
  }

  return (
    <span
      aria-hidden={alt ? undefined : "true"}
      aria-label={alt || undefined}
      className={[
        "inline-flex items-center justify-center font-semibold shrink-0",
        shape,
        sizeClass[size],
        toneGradient[tone],
        fg,
        className,
      ].join(" ")}
    >
      {letter}
    </span>
  );
}
