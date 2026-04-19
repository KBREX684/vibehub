"use client";

/**
 * LedgerStampBadge — v11 core visual element: "印戳"
 *
 * Dashed border + Geist Mono short hash.
 * - Default: tertiary color
 * - Anchored: success color + Check icon
 * - Broken: error color (via prop)
 */

import { Check } from "lucide-react";

interface LedgerStampBadgeProps {
  /** Subset of LedgerEntry fields needed for display. */
  entry: Pick<
    import("@/lib/data/mock-ledger").LedgerEntry,
    "signature" | "anchorChain" | "anchorTxId" | "anchorVerifiedAt"
  >;
  /** When true, renders in broken/error state. */
  broken?: boolean;
  /** Click handler — parent decides what to open (e.g., LegalAnchorCard). */
  onClick?: () => void;
}

function formatShortHash(signature: string): string {
  if (signature.length < 10) return `#${signature}`;
  const first8 = signature.slice(0, 8);
  const last2 = signature.slice(-2);
  return `#${first8}·${last2}`;
}

export function LedgerStampBadge({ entry, broken, onClick }: LedgerStampBadgeProps) {
  const isAnchored = !!(entry.anchorTxId && entry.anchorVerifiedAt);

  let borderColor: string;
  let textColor: string;
  let bgColor: string;

  if (broken) {
    borderColor = "var(--color-error)";
    textColor = "var(--color-error)";
    bgColor = "var(--color-error-subtle)";
  } else if (isAnchored) {
    borderColor = "var(--color-success)";
    textColor = "var(--color-success)";
    bgColor = "var(--color-success-subtle)";
  } else {
    borderColor = "var(--color-border-strong)";
    textColor = "var(--color-text-tertiary)";
    bgColor = "transparent";
  }

  return (
    <span
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") onClick(); } : undefined}
      className="inline-flex items-center gap-1 border rounded-[var(--radius-sm)] px-1.5 py-0.5 cursor-pointer select-none"
      style={{
        borderStyle: "dashed",
        borderWidth: "1px",
        borderColor,
        color: textColor,
        backgroundColor: bgColor,
        fontFamily: "var(--font-mono)",
        fontSize: "11px",
        lineHeight: 1,
      }}
    >
      {isAnchored && !broken ? <Check className="w-3 h-3" style={{ color: textColor }} /> : null}
      {formatShortHash(entry.signature)}
    </span>
  );
}
