"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-fetch";
import type { AdminAiDecisionValue } from "@/lib/types";

const DECISIONS: Array<{ value: Exclude<AdminAiDecisionValue, "pending">; label: string; className: string }> = [
  { value: "accepted", label: "Accept", className: "btn btn-primary text-xs px-3 py-1.5" },
  { value: "modified", label: "Mark modified", className: "btn btn-ghost text-xs px-3 py-1.5" },
  { value: "rejected", label: "Reject", className: "btn btn-ghost text-xs px-3 py-1.5 text-[var(--color-error)] border border-[var(--color-error-border-strong)] hover:bg-[var(--color-error-subtle)]" },
];

export function AdminAiDecisionActions({ suggestionId, currentDecision }: { suggestionId: string; currentDecision?: AdminAiDecisionValue }) {
  const router = useRouter();
  const [busy, setBusy] = useState<Exclude<AdminAiDecisionValue, "pending"> | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(decision: Exclude<AdminAiDecisionValue, "pending">) {
    setBusy(decision);
    setError(null);
    try {
      const response = await apiFetch(`/api/v1/admin/ai-suggestions/${suggestionId}/decision`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision, decisionNote: decisionNote || undefined }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        setError(json?.error?.message ?? "Failed to save AI decision");
        return;
      }
      setDecisionNote("");
      router.refresh();
    } catch {
      setError("Failed to save AI decision");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-2">
      <textarea
        placeholder="Decision note (optional)"
        value={decisionNote}
        onChange={(event) => setDecisionNote(event.target.value)}
        rows={2}
        className="input-base resize-none text-xs"
      />
      <div className="flex flex-wrap items-center gap-2">
        {DECISIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={option.className}
            disabled={busy !== null}
            onClick={() => void submit(option.value)}
          >
            {busy === option.value ? `${option.label}...` : option.label}
          </button>
        ))}
        {currentDecision && currentDecision !== "pending" ? (
          <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-[0.08em]">Current: {currentDecision}</span>
        ) : null}
      </div>
      {error ? <p className="text-xs text-[var(--color-error)] m-0">{error}</p> : null}
    </div>
  );
}
