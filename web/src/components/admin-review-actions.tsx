"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-fetch";

interface Props {
  postId: string;
}

export function AdminReviewActions({ postId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(action: "approve" | "reject") {
    setLoading(action);
    setError(null);
    try {
      const response = await apiFetch(`/api/v1/admin/moderation/posts/${postId}/review`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, note: note || undefined }),
      });

      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        setError(json?.error?.message ?? "Failed to review post");
        return;
      }
      setNote("");
      router.refresh();
    } catch {
      setError("Network error during moderation action");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="admin-actions">
      <textarea
        placeholder="Moderation note (optional)"
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
