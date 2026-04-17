import * as React from "react";
import { Skeleton } from "./skeleton";

export type SkeletonPreset = "list" | "card-grid" | "detail" | "table";

export interface LoadingSkeletonProps {
  preset?: SkeletonPreset;
  /** For card-grid / list — number of placeholder items */
  count?: number;
  className?: string;
  /** For card-grid — columns at lg breakpoint */
  columns?: 1 | 2 | 3 | 4;
}

const gridColsClass: Record<NonNullable<LoadingSkeletonProps["columns"]>, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
};

/**
 * Unified loading-state placeholder. Four presets cover the majority of
 * pages without letting individual components improvise their own.
 */
export function LoadingSkeleton({
  preset = "list",
  count = 4,
  className = "",
  columns = 3,
}: LoadingSkeletonProps) {
  if (preset === "list") {
    return (
      <div className={["space-y-3", className].join(" ")} aria-busy="true">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4 space-y-3"
          >
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-11/12" />
            <Skeleton className="h-3 w-5/6" />
          </div>
        ))}
      </div>
    );
  }

  if (preset === "card-grid") {
    return (
      <div
        className={["grid gap-4", gridColsClass[columns], className].join(" ")}
        aria-busy="true"
      >
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-5 space-y-4"
          >
            <div className="flex items-center gap-3">
              <Skeleton circle className="h-8 w-8" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (preset === "detail") {
    return (
      <div className={["space-y-6", className].join(" ")} aria-busy="true">
        <div className="space-y-3">
          <Skeleton className="h-7 w-3/5" />
          <Skeleton className="h-3 w-2/5" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-11/12" />
          <Skeleton className="h-3 w-10/12" />
          <Skeleton className="h-3 w-9/12" />
          <Skeleton className="h-3 w-8/12" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      </div>
    );
  }

  // table
  return (
    <div
      className={[
        "rounded-[var(--radius-lg)] border border-[var(--color-border)] overflow-hidden",
        className,
      ].join(" ")}
      aria-busy="true"
    >
      <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
        <Skeleton className="h-3 w-1/3" />
      </div>
      <div className="divide-y divide-[var(--color-border-subtle)]">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="px-4 py-3 flex items-center gap-4">
            <Skeleton circle className="h-7 w-7" />
            <Skeleton className="h-3 flex-1" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
