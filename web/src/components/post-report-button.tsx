"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api-fetch";

export function PostReportButton({ postSlug }: { postSlug: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submitReport() {
    const reason = window.prompt("Describe the issue with this post (at least 8 characters):");
    if (!reason) return;

    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const response = await apiFetch("/api/v1/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ postSlug, reason }),
      });
      const json = await response.json().catch(() => null);
      if (response.status === 401) {
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
        return;
      }
      if (!response.ok) {
        setError(json?.error?.message ?? "Could not submit report");
        return;
      }
      setMessage("Report submitted. Admin review will handle it manually.");
    } catch {
      setError("Could not submit report");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => void submitReport()}
        className="btn btn-ghost text-xs px-3 py-1.5 border border-[var(--color-error-border)] text-[var(--color-error)] hover:bg-[var(--color-error-subtle)]"
      >
        {busy ? "Submitting..." : "Report post"}
      </button>
      {message ? <p className="text-[10px] text-[var(--color-text-muted)] m-0">{message}</p> : null}
      {error ? <p className="text-[10px] text-[var(--color-error)] m-0">{error}</p> : null}
    </div>
  );
}
