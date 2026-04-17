"use client";

import * as React from "react";
import { Modal } from "./modal";
import { Button } from "./button";

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  /** Invoked when the user confirms. Resolve/reject controls loading state. */
  onConfirm: () => void | Promise<void>;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: React.ReactNode;
  cancelLabel?: React.ReactNode;
  /** Visual tone — use "destructive" for delete/remove/ban. */
  tone?: "default" | "destructive";
  /** Extra content rendered above the actions (e.g. a confirm-text input). */
  children?: React.ReactNode;
}

/**
 * Consistent confirmation dialog for destructive or high-risk actions.
 * Blocks page scroll while open and traps focus via the underlying Modal.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "确认",
  cancelLabel = "取消",
  tone = "default",
  children,
}: ConfirmDialogProps) {
  const [loading, setLoading] = React.useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={loading ? () => undefined : onClose} title={title} size="sm">
      <div className="space-y-4">
        {description ? (
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed m-0">
            {description}
          </p>
        ) : null}
        {children}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "destructive" ? "destructive" : "primary"}
            size="sm"
            onClick={handleConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
