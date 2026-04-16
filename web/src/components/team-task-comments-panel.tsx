"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { TeamActivityLogEntry, TeamTaskComment } from "@/lib/types";
import { apiFetch } from "@/lib/api-fetch";
import { MessageSquare, History } from "lucide-react";

interface Props {
  teamSlug: string;
  taskId: string;
}

export function TeamTaskCommentsPanel({ teamSlug, taskId }: Props) {
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
        setMessage(commentsJson.error?.message ?? "Failed to load task comments");
        return;
      }
      if (!activityRes.ok) {
        setMessage(activityJson.error?.message ?? "Failed to load task activity");
        return;
      }
      setComments(commentsJson.data?.comments ?? []);
      setActivity(activityJson.data?.items ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }, [taskId, teamSlug]);

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
        setMessage(json.error?.message ?? "Failed to comment on task");
        return;
      }
      setBody("");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <div className="space-y-6">
      <section className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[var(--color-accent-cyan)]" />
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)] m-0">Task comments</h2>
        </div>
        <form onSubmit={(event) => void submit(event)} className="space-y-3">
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={2000}
            required
            placeholder="Share progress, review notes, or blockers."
            className="min-h-24 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-canvas)] px-3 py-2 text-sm"
          />
          <button type="submit" className="btn btn-primary text-sm px-4 py-2">Post comment</button>
        </form>
        <div className="space-y-3">
          {comments.map((comment) => (
            <article key={comment.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-3">
              <p className="text-sm text-[var(--color-text-primary)] whitespace-pre-wrap m-0">{comment.body}</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-2 mb-0">{comment.authorName} · {new Date(comment.createdAt).toLocaleString()}</p>
            </article>
          ))}
          {comments.length === 0 ? <p className="text-sm text-[var(--color-text-secondary)] m-0">No comments yet.</p> : null}
        </div>
      </section>

      <section className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-[var(--color-warning)]" />
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)] m-0">Task activity</h2>
        </div>
        <div className="space-y-3">
          {activity.map((item) => (
            <div key={item.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-3">
              <p className="text-sm font-medium text-[var(--color-text-primary)] m-0">{item.action.replaceAll("_", " ")}</p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-1 mb-0">{item.actorName ?? item.actorId} · {new Date(item.createdAt).toLocaleString()}</p>
            </div>
          ))}
          {activity.length === 0 ? <p className="text-sm text-[var(--color-text-secondary)] m-0">No task activity yet.</p> : null}
        </div>
      </section>

      {message ? <p className="text-sm text-[var(--color-danger)] m-0">{message}</p> : null}
    </div>
  );
}
