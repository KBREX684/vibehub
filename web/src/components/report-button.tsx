"use client";

import { useState } from "react";
import { Flag, Loader2, CheckCircle, X } from "lucide-react";

/**
 * S4-05: Reusable report/flag button for content moderation.
 *
 * Can be embedded in post detail, project detail, comment thread, or user profile.
 * Submits to POST /api/v1/reports.
 */
export function ReportButton({
  targetType,
  targetId,
  className = "",
}: {
  targetType: "post" | "project" | "comment" | "user";
  targetId: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error" | "duplicate">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (reason.trim().length < 5) return;

    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/v1/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId, reason: reason.trim() }),
      });

      if (res.status === 409) {
        setStatus("duplicate");
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setStatus("error");
        setErrorMsg(data?.error?.message || "Failed to submit report");
        return;
      }

      setStatus("done");
    } catch {
      setStatus("error");
      setErrorMsg("Network error. Please try again.");
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-error)] transition-colors ${className}`}
        title="Report this content"
      >
        <Flag className="w-3.5 h-3.5" />
        <span>Report</span>
      </button>
    );
  }

  if (status === "done") {
    return (
      <div className="flex items-center gap-2 text-xs text-[var(--color-success,#22c55e)]">
        <CheckCircle className="w-3.5 h-3.5" />
        <span>Report submitted. Thank you.</span>
      </div>
    );
  }

  if (status === "duplicate") {
    return (
      <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
        <Flag className="w-3.5 h-3.5" />
        <span>You have already reported this content.</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 p-3 border border-[var(--color-border)] rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)]">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--color-text-primary)]">
          Report this {targetType}
        </span>
        <button
          type="button"
          onClick={() => { setOpen(false); setStatus("idle"); setReason(""); }}
          className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Why are you reporting this? (min 5 characters)"
        rows={3}
        maxLength={2000}
        disabled={status === "loading"}
        className="w-full text-xs p-2 bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-[var(--radius-sm)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] disabled:opacity-50 resize-none"
      />

      {errorMsg && (
        <p className="text-xs text-[var(--color-error)]">{errorMsg}</p>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => { setOpen(false); setStatus("idle"); setReason(""); }}
          className="text-xs px-3 py-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          disabled={status === "loading"}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={status === "loading" || reason.trim().length < 5}
          className="text-xs px-3 py-1.5 bg-[var(--color-error)] text-white rounded-[var(--radius-sm)] hover:opacity-90 disabled:opacity-50 flex items-center gap-1"
        >
          {status === "loading" ? (
            <><Loader2 className="w-3 h-3 animate-spin" /> Submitting...</>
          ) : (
            <><Flag className="w-3 h-3" /> Submit Report</>
          )}
        </button>
      </div>
    </form>
  );
}
