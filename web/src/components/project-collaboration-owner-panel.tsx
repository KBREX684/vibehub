"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CollaborationIntentType } from "@/lib/types";

interface PendingIntent {
  id: string;
  intentType: CollaborationIntentType;
  message: string;
}

interface TeamOption {
  slug: string;
  name: string;
}

interface Props {
  projectSlug: string;
  intents: PendingIntent[];
  teams: TeamOption[];
}

export function ProjectCollaborationOwnerPanel({ projectSlug, intents, teams }: Props) {
  const router = useRouter();
  const [inviteSlug, setInviteSlug] = useState(teams[0]?.slug ?? "");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function review(intentId: string, action: "approve" | "reject") {
    setLoadingId(intentId);
    setError(null);
    try {
      const body: Record<string, unknown> = { action };
      if (action === "approve" && inviteSlug) {
        body.inviteToTeamSlug = inviteSlug;
      }
      const res = await fetch(
        `/api/v1/projects/${encodeURIComponent(projectSlug)}/collaboration-intents/${encodeURIComponent(intentId)}/review`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const json = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        setError(json.error?.message ?? "Review failed");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoadingId(null);
    }
  }

  if (intents.length === 0) {
    return null;
  }

  return (
    <section className="card p-6 border border-[rgba(129,230,217,0.25)]">
      <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">Review collaboration intents</h2>
      <p className="text-xs text-[var(--color-text-secondary)] mb-4">
        Approve or reject pending requests. For join intents, you can add the applicant to one of your teams when you approve.
      </p>

      {teams.length > 0 ? (
        <div className="mb-5">
          <label htmlFor="collab-invite-team" className="text-xs font-semibold text-[var(--color-text-secondary)] block mb-1.5">
            Team to invite on approve (optional)
          </label>
          <select
            id="collab-invite-team"
            value={inviteSlug}
            onChange={(e) => setInviteSlug(e.target.value)}
            className="input-base text-sm max-w-md"
          >
            <option value="">Do not auto-add to a team</option>
            {teams.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.name} ({t.slug})
              </option>
            ))}
          </select>
        </div>
      ) : (
        <p className="text-xs text-[var(--color-text-muted)] mb-4">
          Create a team and link it from this project to enable one-click invites when approving join requests.
        </p>
      )}

      {error ? <p className="text-xs text-[var(--color-error)] mb-3">{error}</p> : null}

      <ul className="space-y-3">
        {intents.map((intent) => (
          <li
            key={intent.id}
            className="p-4 rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)]"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-medium text-[var(--color-text-muted)] capitalize">{intent.intentType}</span>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] mb-3 whitespace-pre-wrap">{intent.message}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-primary text-xs px-3 py-1.5"
                disabled={loadingId !== null}
                onClick={() => void review(intent.id, "approve")}
              >
                {loadingId === intent.id ? "…" : "Approve"}
              </button>
              <button
                type="button"
                className="btn btn-ghost text-xs px-3 py-1.5 text-[var(--color-error)] border border-[rgba(239,68,68,0.35)]"
                disabled={loadingId !== null}
                onClick={() => void review(intent.id, "reject")}
              >
                Reject
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
