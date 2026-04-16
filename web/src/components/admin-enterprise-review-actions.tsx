"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-fetch";

export function AdminEnterpriseReviewActions({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(action: "approve" | "reject") {
    setLoading(action);
    setError(null);
    try {
      const response = await apiFetch("/api/v1/admin/enterprise/verifications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ applicationId, action, note: note || undefined }),
      });
      if (!response.ok) {
        const json = await response.json().catch(() => null);
        setError(json?.error?.message ?? "Failed to review enterprise verification");
        return;
      }
      setNote("");
      router.refresh();
    } catch {
      setError("Failed to review enterprise verification");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-2">
      <textarea
        placeholder="Review note (optional)"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={2}
        className="input-base resize-none text-xs"
      />
      <div className="flex items-center gap-2">
        <button type="button" className="btn btn-primary text-xs px-3 py-1.5" disabled={loading !== null} onClick={() => void submit("approve")}>
          {loading === "approve" ? "Approving..." : "Approve"}
        </button>
        <button type="button" className="btn btn-ghost text-xs px-3 py-1.5 text-[var(--color-error)] border border-[rgba(239,68,68,0.35)] hover:bg-[var(--color-error-subtle)]" disabled={loading !== null} onClick={() => void submit("reject")}>
          {loading === "reject" ? "Rejecting..." : "Reject"}
        </button>
      </div>
      {error ? <p className="text-xs text-[var(--color-error)] m-0">{error}</p> : null}
    </div>
  );
}
