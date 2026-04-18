"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { TeamDiscussion } from "@/lib/types";
import { apiFetch } from "@/lib/api-fetch";
import { MessageSquarePlus } from "lucide-react";
import { useLanguage } from "@/app/context/LanguageContext";
import { formatLocalizedDateTime } from "@/lib/formatting";
import { Button } from "@/components/ui";

interface Props {
  teamSlug: string;
  currentUserId: string | null;
}

export function TeamDiscussionsPanel({ teamSlug, currentUserId }: Props) {
  const { language, t } = useLanguage();
  const [items, setItems] = useState<TeamDiscussion[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);
    setMessage(null);
    try {
      const response = await apiFetch(`/api/v1/teams/${encodeURIComponent(teamSlug)}/discussions?page=1&limit=20`, {
        credentials: "include",
      });
      const json = (await response.json()) as { data?: { items?: TeamDiscussion[] }; error?: { message?: string } };
      if (!response.ok) {
        setMessage(json.error?.message ?? t("team.discussions.load_failed", "Failed to load team discussions"));
        setItems([]);
        return;
      }
      setItems(json.data?.items ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("team.discussions.load_failed", "Failed to load team discussions"));
    } finally {
      setLoading(false);
    }
  }, [currentUserId, t, teamSlug]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    try {
      const response = await apiFetch(`/api/v1/teams/${encodeURIComponent(teamSlug)}/discussions`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: body.trim() }),
      });
      const json = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        setMessage(json.error?.message ?? t("team.discussions.create_failed", "Failed to create discussion"));
        return;
      }
      setTitle("");
      setBody("");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("team.discussions.create_failed", "Failed to create discussion"));
    }
  }

  return (
    <section className="card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquarePlus className="w-4 h-4 text-[var(--color-featured)]" />
        <div>
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)] m-0">
            {t("team.discussions.title", "Team discussions")}
          </h2>
          <p className="text-xs text-[var(--color-text-secondary)] m-0">
            {t("team.discussions.subtitle", "Structured threads for planning, decisions, and review notes.")}
          </p>
        </div>
      </div>

      {currentUserId ? (
        <form onSubmit={(event) => void submit(event)} className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={120}
            required
            placeholder={t("team.discussions.title_placeholder", "Start a discussion title")}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-canvas)] px-3 py-2 text-sm"
          />
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={4000}
            required
            placeholder={t("team.discussions.body_placeholder", "Capture the decision, open questions, or review context.")}
            className="min-h-28 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-canvas)] px-3 py-2 text-sm"
          />
          <Button type="submit" className="text-sm px-4 py-2">
            {t("team.discussions.post", "Post discussion")}
          </Button>
        </form>
      ) : (
        <p className="text-sm text-[var(--color-text-secondary)] m-0">
          {t("team.discussions.sign_in_hint", "Join the team to read and write structured discussions.")}
        </p>
      )}

      {loading ? <p className="text-sm text-[var(--color-text-secondary)] m-0">{t("team.discussions.loading", "Loading discussions...")}</p> : null}
      {!loading && items.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-text-secondary)]">
          {t("team.discussions.empty", "No team discussions yet.")}
        </div>
      ) : null}
      <div className="space-y-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-canvas)] p-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)] m-0">{item.title}</h3>
              <span className="text-[11px] text-[var(--color-text-muted)]">
                {formatLocalizedDateTime(item.updatedAt, language)}
              </span>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap m-0">{item.body}</p>
            <p className="text-xs text-[var(--color-text-muted)] m-0">
              {t("common.by", "By")} {item.authorName}
            </p>
          </article>
        ))}
      </div>
      {message ? <p className="text-sm text-[var(--color-danger)] m-0">{message}</p> : null}
    </section>
  );
}
