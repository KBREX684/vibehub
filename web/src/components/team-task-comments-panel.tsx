"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { TeamActivityLogEntry, TeamTaskComment } from "@/lib/types";
import { apiFetch } from "@/lib/api-fetch";
import { MessageSquare, History } from "lucide-react";
import { useLanguage } from "@/app/context/LanguageContext";
import { formatLocalizedDateTime } from "@/lib/formatting";
import { Button, Badge } from "@/components/ui";

interface Props {
  teamSlug: string;
  taskId: string;
}

export function TeamTaskCommentsPanel({ teamSlug, taskId }: Props) {
  const { language, t } = useLanguage();
  const [comments, setComments] = useState<TeamTaskComment[]>([]);
  const [activity, setActivity] = useState<TeamActivityLogEntry[]>([]);
  const [body, setBody] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setMessage(null);
    try {
      const [commentsRes, activityRes] = await Promise.all([
        apiFetch(`/api/v1/teams/${encodeURIComponent(teamSlug)}/tasks/${encodeURIComponent(taskId)}/comments`, { credentials: "include" }),
        apiFetch(`/api/v1/teams/${encodeURIComponent(teamSlug)}/tasks/${encodeURIComponent(taskId)}/activity`, { credentials: "include" }),
      ]);
      const commentsJson = (await commentsRes.json()) as { data?: { comments?: TeamTaskComment[] }; error?: { message?: string } };
      const activityJson = (await activityRes.json()) as { data?: { items?: TeamActivityLogEntry[] }; error?: { message?: string } };
      if (!commentsRes.ok) {
        setMessage(commentsJson.error?.message ?? t("team.task_comments.load_failed", "Failed to load task comments"));
        return;
      }
      if (!activityRes.ok) {
        setMessage(activityJson.error?.message ?? t("team.task_comments.activity_failed", "Failed to load task activity"));
        return;
      }
      setComments(commentsJson.data?.comments ?? []);
      setActivity(activityJson.data?.items ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("team.task_comments.load_failed", "Failed to load task comments"));
    }
  }, [t, taskId, teamSlug]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    try {
      const response = await apiFetch(`/api/v1/teams/${encodeURIComponent(teamSlug)}/tasks/${encodeURIComponent(taskId)}/comments`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim() }),
      });
      const json = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        setMessage(json.error?.message ?? t("team.task_comments.create_failed", "Failed to comment on task"));
        return;
      }
      setBody("");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("team.task_comments.create_failed", "Failed to comment on task"));
    }
  }

  return (
    <div className="space-y-6">
      <section className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[var(--color-accent-cyan)]" />
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)] m-0">
            {t("team.task_comments.title", "Task comments")}
          </h2>
        </div>
        <form onSubmit={(event) => void submit(event)} className="space-y-3">
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={2000}
            required
            placeholder={t("team.task_comments.placeholder", "Share progress, review notes, or blockers.")}
            className="min-h-24 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-canvas)] px-3 py-2 text-sm"
          />
          <Button type="submit" className="text-sm px-4 py-2">
            {t("team.task_comments.post", "Post comment")}
          </Button>
        </form>
        <div className="space-y-3">
          {comments.map((comment) => (
            <article key={comment.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-3">
              <p className="text-sm text-[var(--color-text-primary)] whitespace-pre-wrap m-0">{comment.body}</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-2 mb-0">
                {comment.authorName} · {formatLocalizedDateTime(comment.createdAt, language)}
              </p>
            </article>
          ))}
          {comments.length === 0 ? <p className="text-sm text-[var(--color-text-secondary)] m-0">{t("team.task_comments.empty", "No comments yet.")}</p> : null}
        </div>
      </section>

      <section className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-[var(--color-warning)]" />
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)] m-0">
            {t("team.task_comments.activity_title", "Task activity")}
          </h2>
        </div>
        <div className="space-y-3">
          {activity.map((item) => (
            <div key={item.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-3">
              <div className="flex items-center gap-2">
                <Badge pill mono size="sm">{item.action.replaceAll("_", " ")}</Badge>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)] mt-2 mb-0">
                {(item.actorName ?? item.actorId)} · {formatLocalizedDateTime(item.createdAt, language)}
              </p>
            </div>
          ))}
          {activity.length === 0 ? <p className="text-sm text-[var(--color-text-secondary)] m-0">{t("team.task_comments.activity_empty", "No task activity yet.")}</p> : null}
        </div>
      </section>

      {message ? <p className="text-sm text-[var(--color-error)] m-0">{message}</p> : null}
    </div>
  );
}
