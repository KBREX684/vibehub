"use client";

import * as React from "react";
import { EmptyState } from "./empty-state";
import { LoadingSkeleton } from "./loading-skeleton";

export interface DataTableColumn<T> {
  key: string;
  header: React.ReactNode;
  /** Render cell for a given row. */
  cell: (row: T, index: number) => React.ReactNode;
  /** Fixed column width (e.g. "120px", "20%"). */
  width?: string;
  /** Align content. Defaults to "left". */
  align?: "left" | "center" | "right";
  /** Pin the column to the left on narrow viewports. */
  sticky?: boolean;
  /** Prevent text wrapping. */
  nowrap?: boolean;
}

export interface DataTableProps<T> {
  columns: Array<DataTableColumn<T>>;
  rows: T[];
  /** Unique row id resolver. */
  rowKey: (row: T, index: number) => string;
  loading?: boolean;
  /** Custom empty state. */
  emptyState?: React.ReactNode;
  /** Called when a row is clicked. */
  onRowClick?: (row: T) => void;
  /** Dense padding. */
  dense?: boolean;
  className?: string;
  /** Toolbar slot rendered above the table (e.g. search / filters). */
  toolbar?: React.ReactNode;
  /** Footer slot rendered below the table (e.g. pagination). */
  footer?: React.ReactNode;
  /** Optional caption for a11y. */
  caption?: React.ReactNode;
}

const alignClass: Record<NonNullable<DataTableColumn<unknown>["align"]>, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

/**
 * Production-grade table primitive for admin panels, settings lists, and
 * anywhere raw `<table>` was previously hand-rolled. Handles:
 *   - loading skeleton
 *   - empty state
 *   - horizontal overflow with optional sticky first column
 *   - toolbar / footer slots
 *   - clickable rows
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  emptyState,
  onRowClick,
  dense = false,
  className = "",
  toolbar,
  footer,
  caption,
}: DataTableProps<T>) {
  const padY = dense ? "py-2" : "py-3";
  const padX = "px-4";
  return (
    <div
      className={[
        "rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] overflow-hidden",
        className,
      ].join(" ")}
    >
      {toolbar ? (
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--color-border)]">
          {toolbar}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          {caption ? (
            <caption className="sr-only">{caption}</caption>
          ) : null}
          <thead>
            <tr className="bg-[var(--color-bg-subtle)] border-b border-[var(--color-border)]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  style={col.width ? { width: col.width } : undefined}
                  className={[
                    padX,
                    padY,
                    "text-xs font-mono font-medium uppercase tracking-wider text-[var(--color-text-tertiary)]",
                    alignClass[col.align ?? "left"],
                    col.sticky ? "sticky left-0 bg-[var(--color-bg-subtle)] z-[1]" : "",
                    col.nowrap ? "whitespace-nowrap" : "",
                  ].join(" ")}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="p-0">
                  <LoadingSkeleton preset="table" count={5} className="border-0 rounded-none" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  {emptyState ?? <EmptyState title="暂无数据" />}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr
                  key={rowKey(row, index)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={[
                    "border-b border-[var(--color-border-subtle)] last:border-b-0",
                    onRowClick
                      ? "cursor-pointer hover:bg-[var(--color-bg-surface-hover)] transition-colors"
                      : "",
                  ].join(" ")}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={[
                        padX,
                        padY,
                        "text-sm text-[var(--color-text-secondary)] align-middle",
                        alignClass[col.align ?? "left"],
                        col.sticky ? "sticky left-0 bg-[var(--color-bg-surface)] z-[1]" : "",
                        col.nowrap ? "whitespace-nowrap" : "",
                      ].join(" ")}
                    >
                      {col.cell(row, index)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {footer ? (
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-[var(--color-border)]">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
