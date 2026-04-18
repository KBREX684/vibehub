"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-fetch";

interface Props {
  intentId: string;
}

export function AdminCollaborationReviewActions({ intentId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [note, setNote] = useState("");
  const [inviteToTeamOnApprove, setInviteToTeamOnApprove] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function submit(action: "approve" | "reject") {
    setLoading(action);
    setError(null);

    try {
      const response = await apiFetch(`/api/v1/admin/collaboration-intents/${intentId}/review`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action,
          note: note || undefined,
          ...(action === "approve" ? { inviteApplicantToTeamOnApprove: inviteToTeamOnApprove } : {}),
        }),
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
    <div className="space-y-3">
      <textarea
        placeholder="Review note (optional)"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={2}
        className="input-base resize-none text-xs"
      />
      <label className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)] cursor-pointer select-none">
        <input
          type="checkbox"
          checked={inviteToTeamOnApprove}
          onChange={(e) => setInviteToTeamOnApprove(e.target.checked)}
          className="rounded border-[var(--color-border)]"
        />
        On approve (join intents): add applicant to the project’s linked team when possible
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="btn btn-primary text-xs px-3 py-1.5"
          disabled={loading !== null}
          onClick={() => submit("approve")}
        >
          {loading === "approve" ? "Approving..." : "Approve"}
        </button>
        <button
          type="button"
          className="btn btn-ghost text-xs px-3 py-1.5 text-[var(--color-error)] border border-[var(--color-error-border-strong)] hover:bg-[var(--color-error-subtle)]"
          disabled={loading !== null}
          onClick={() => submit("reject")}
        >
          {loading === "reject" ? "Rejecting..." : "Reject"}
        </button>
      </div>
      {error ? <p className="text-xs text-[var(--color-error)]">{error}</p> : null}
    </div>
  );
}
