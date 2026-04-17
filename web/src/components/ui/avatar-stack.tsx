import * as React from "react";
import { Avatar, type AvatarSize, type AvatarTone } from "./avatar";

export interface AvatarStackItem {
  id?: string | number;
  src?: string | null;
  alt?: string;
  initial?: string;
  tone?: AvatarTone;
  square?: boolean;
}

export interface AvatarStackProps {
  items: AvatarStackItem[];
  size?: AvatarSize;
  max?: number;
  totalCount?: number;
  className?: string;
}

const overlapClass: Record<AvatarSize, string> = {
  xs: "-ml-1.5",
  sm: "-ml-2",
  md: "-ml-2.5",
  lg: "-ml-3",
  xl: "-ml-4",
};

const countSizeClass: Record<AvatarSize, string> = {
  xs: "w-5 h-5 text-[9px]",
  sm: "w-6 h-6 text-[10px]",
  md: "w-8 h-8 text-xs",
  lg: "w-10 h-10 text-sm",
  xl: "w-14 h-14 text-base",
};

export function AvatarStack({
  items,
  size = "sm",
  max = 4,
  totalCount,
  className = "",
}: AvatarStackProps) {
  if (items.length === 0) return null;

  const visibleItems = items.slice(0, Math.max(1, max));
  const visibleCount = visibleItems.length;
  const resolvedTotalCount = Math.max(totalCount ?? items.length, visibleCount);
  const overflowCount = Math.max(resolvedTotalCount - visibleCount, 0);

  return (
    <div className={["flex items-center", className].join(" ")}>
      {visibleItems.map((item, index) => (
        <span
          key={item.id ?? `${item.alt ?? item.initial ?? "avatar"}-${index}`}
          className={[
            "inline-flex",
            index === 0 ? "" : overlapClass[size],
          ].join(" ")}
        >
          <Avatar
            src={item.src}
            alt={item.alt}
            initial={item.initial}
            tone={item.tone ?? "neutral"}
            square={item.square}
            size={size}
            className="ring-2 ring-[var(--color-bg-canvas)] shadow-sm"
          />
        </span>
      ))}
      {overflowCount > 0 && (
        <span
          className={[
            "inline-flex items-center justify-center rounded-full shrink-0 border-2 border-[var(--color-bg-canvas)] bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] font-semibold shadow-sm",
            overlapClass[size],
            countSizeClass[size],
          ].join(" ")}
          aria-label={`${overflowCount} more`}
        >
          +{overflowCount}
        </span>
      )}
    </div>
  );
}
