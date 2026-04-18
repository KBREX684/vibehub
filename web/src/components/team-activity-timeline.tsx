"use client";

import { useCallback, useEffect, useState } from "react";
import type { TeamActivityLogEntry } from "@/lib/types";
import { apiFetch } from "@/lib/api-fetch";
import { Bot, History, ListChecks, MessageSquareText } from "lucide-react";
import { useLanguage } from "@/app/context/LanguageContext";
import { formatLocalizedDateTime } from "@/lib/formatting";

interface Props {
  teamSlug: string;
  currentUserId: string | null;
  fullWidth?: boolean;
}

const FILTERS: Array<{
  value: "all" | TeamActivityLogEntry["kind"];
  label: string;
  icon: typeof History;
}> = [
  { value: "all", label: "All", icon: History },
  { value: "task", label: "Tasks", icon: ListChecks },
  { value: "discussion", label: "Discussions", icon: MessageSquareText },
  { value: "agent", label: "Agent", icon: Bot },
];

function labelForEntry(item: TeamActivityLogEntry): string {
  if (item.summary) return item.summary;
  return item.action.replaceAll("_", " ");
}

export function TeamActivityTimeline({ teamSlug, currentUserId, fullWidth = false }: Props) {
  const { language, t } = useLanguage();
  const [interactive, setInteractive] = useState(false);
  const [items, setItems] = useState<TeamActivityLogEntry[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | TeamActivityLogEntry["kind"]>("all");
  const emptyMessage =
    filter === "all"
      ? t("team.timeline.empty_all", "No recorded team activity yet.")
      : t("team.timeline.empty_kind", "No {kind} events recorded yet.").replace("{kind}", filter);

  const load = useCallback(async () => {
    if (!currentUserId) return;
    try {
      setMessage(null);
      const response = await apiFetch(
        `/api/v1/teams/${encodeURIComponent(teamSlug)}/activity-log?page=1&limit=${fullWidth ? 24 : 12}&type=${filter}`,
        {
          credentials: "include",
        }
      );
      const json = (await response.json()) as { data?: { items?: TeamActivityLogEntry[] }; error?: { message?: string } };
      if (!response.ok) {
        setMessage(json.error?.message ?? t("team.timeline.load_failed", "Failed to load the activity timeline."));
        setItems([]);
        return;
      }
      setItems(json.data?.items ?? []);
    } catch (error) {
      setMessage(error instanceof Error && error.message ? error.message : t("team.timeline.load_failed", "Failed to load the activity timeline."));
    }
  }, [currentUserId, filter, fullWidth, t, teamSlug]);

  useEffect(() => {
    setInteractive(true);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className={`card p-5 space-y-4 ${fullWidth ? "min-h-[28rem]" : ""}`}>
      <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-[var(--color-warning)]" />
          <div>
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)] m-0">{t("team.timeline.title", "Team timeline")}</h2>
          <p className="text-xs text-[var(--color-text-secondary)] m-0">
            {t("team.timeline.subtitle", "Task changes, structured discussions, and agent actions in one filtered stream.")}
          </p>
        </div>
      </div>
      {currentUserId ? (
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              disabled={!interactive}
              className={`inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border px-3 py-1.5 text-xs transition-colors ${
                filter === value
                  ? "border-[var(--color-border-strong)] bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]"
                  : "border-[var(--color-border)] bg-[var(--color-bg-canvas)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t(`team.timeline.filter_${value}`, label)}
            </button>
          ))}
        </div>
      ) : null}
      {!currentUserId ? (
        <p className="text-sm text-[var(--color-text-secondary)] m-0">{t("team.timeline.sign_in_required", "Join the team to inspect the activity timeline.")}</p>
      ) : items.length === 0 ? (
        <div
          key={filter}
          data-testid="team-timeline-empty-state"
          className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] p-4 text-sm text-[var(--color-text-secondary)]"
        >
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="tag text-[10px] uppercase tracking-wide">{item.kind}</span>
                <p className="text-sm font-medium text-[var(--color-text-primary)] m-0">{labelForEntry(item)}</p>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)] mt-1 mb-0">
                {item.actorName ?? item.actorId} · {formatLocalizedDateTime(item.createdAt, language)}
              </p>
            </div>
          ))}
        </div>
      )}
      {message ? <p className="text-sm text-[var(--color-error)] m-0">{message}</p> : null}
    </section>
  );
}
