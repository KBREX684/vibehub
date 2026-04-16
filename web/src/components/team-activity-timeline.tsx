"use client";

import { useCallback, useEffect, useState } from "react";
import type { TeamActivityLogEntry } from "@/lib/types";
import { apiFetch } from "@/lib/api-fetch";
import { History } from "lucide-react";

interface Props {
  teamSlug: string;
  currentUserId: string | null;
}

export function TeamActivityTimeline({ teamSlug, currentUserId }: Props) {
  const [items, setItems] = useState<TeamActivityLogEntry[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const response = await apiFetch(`/api/v1/teams/${encodeURIComponent(teamSlug)}/activity-log?page=1&limit=12`, {
        credentials: "include",
      });
      const json = (await response.json()) as { data?: { items?: TeamActivityLogEntry[] }; error?: { message?: string } };
      if (!response.ok) {
        setMessage(json.error?.message ?? "Failed to load activity timeline");
        setItems([]);
        return;
      }
      setItems(json.data?.items ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }, [currentUserId, teamSlug]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <History className="w-4 h-4 text-[var(--color-warning)]" />
        <div>
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)] m-0">Team timeline</h2>
          <p className="text-xs text-[var(--color-text-secondary)] m-0">Recent join reviews, task changes, discussion threads, and milestone work.</p>
        </div>
      </div>
      {!currentUserId ? (
        <p className="text-sm text-[var(--color-text-secondary)] m-0">Join the team to inspect the activity timeline.</p>
      ) : items.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] p-4 text-sm text-[var(--color-text-secondary)]">
          No recorded team activity yet.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-3">
              <p className="text-sm font-medium text-[var(--color-text-primary)] m-0">{item.action.replaceAll("_", " ")}</p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-1 mb-0">{item.actorName ?? item.actorId} · {item.entityType} · {new Date(item.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
      {message ? <p className="text-sm text-[var(--color-danger)] m-0">{message}</p> : null}
    </section>
  );
}
