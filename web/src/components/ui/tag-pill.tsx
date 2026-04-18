import * as React from "react";
import { Badge } from "./badge";

export type TagPillAccent =
  | "default"
  | "apple"
  | "violet"
  | "cyan"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "enterprise";

export interface TagPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  accent?: TagPillAccent;
  /** Use monospace font (for slugs, technical labels, tags). */
  mono?: boolean;
  /** Smaller visual size. */
  size?: "sm" | "md";
}

/**
 * A pill-shaped tag for stack items, meta chips, technical labels, etc.
 * Prefer this over re-styling `Badge` when the use-case is a "tag list".
 */
export function TagPill({
  accent = "default",
  mono = false,
  size = "md",
  className = "",
  children,
  ...rest
}: TagPillProps) {
  return (
    <Badge
      {...rest}
      variant={accent}
      pill
      mono={mono}
      size={size}
      className={className}
    >
      {children}
    </Badge>
  );
}
