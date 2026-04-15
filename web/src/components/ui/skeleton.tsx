import * as React from "react";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Convenience shorthand for `rounded-full` (circular avatar skeletons) */
  circle?: boolean;
}

export function Skeleton({ circle = false, className = "", ...rest }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={[
        "animate-pulse bg-[var(--color-bg-elevated)]",
        circle ? "rounded-full" : "rounded-[var(--radius-md)]",
        className,
      ].join(" ")}
      {...rest}
    />
  );
}

/** Ready-made card skeleton matching the `.card` utility */
export function CardSkeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={[
        "rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-5 space-y-3",
        className,
      ].join(" ")}
    >
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
    </div>
  );
}
