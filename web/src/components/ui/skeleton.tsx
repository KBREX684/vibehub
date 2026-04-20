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
        "bg-[var(--color-bg-subtle)]",
        "animate-[shimmer_1.4s_ease-in-out_infinite]",
        circle ? "rounded-full" : "rounded-[var(--radius-md)]",
        className,
      ].join(" ")}
      style={{
        backgroundImage: "linear-gradient(90deg, transparent 0%, var(--color-bg-surface-hover) 50%, transparent 100%)",
        backgroundSize: "200% 100%",
      }}
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
