"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  intentId: string;
}

export function AdminCollaborationReviewActions({ intentId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(action: "approve" | "reject") {
    setLoading(action);
    setError(null);

    try {
      const response = await fetch(`/api/v1/admin/collaboration-intents/${intentId}/review`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, note: note || undefined }),
      });

      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        setError(json?.error?.message ?? "Failed to review collaboration intent");
        return;
      }

      setNote("");
      router.refresh();
    } catch {
      setError("Network error during collaboration review action");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="admin-actions">
      <textarea
        placeholder="Review note (optional)"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={2}
      />
      <div className="button-row">
        <button
          type="button"
          className="button success"
          disabled={loading !== null}
          onClick={() => submit("approve")}
        >
          {loading === "approve" ? "Approving..." : "Approve"}
        </button>
        <button
          type="button"
          className="button danger"
          disabled={loading !== null}
          onClick={() => submit("reject")}
        >
          {loading === "reject" ? "Rejecting..." : "Reject"}
        </button>
      </div>
      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}