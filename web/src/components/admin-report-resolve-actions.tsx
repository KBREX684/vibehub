"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-fetch";

export function AdminReportResolveActions({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function closeTicket() {
    setBusy(true);
    setError(null);
    try {
      const response = await apiFetch(`/api/v1/admin/reports/${reportId}/resolve`, {
        method: "POST",
      });
      if (!response.ok) {
        const json = await response.json().catch(() => null);
        setError(json?.error?.message ?? "Failed to close report");
        return;
      }
      router.refresh();
    } catch {
      setError("Failed to close report");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        className="btn btn-primary text-xs px-3 py-1.5"
        disabled={busy}
        onClick={() => void closeTicket()}
      >
        {busy ? "Closing..." : "Close report"}
      </button>
      {error ? <p className="text-xs text-[var(--color-error)] m-0">{error}</p> : null}
    </div>
  );
}
