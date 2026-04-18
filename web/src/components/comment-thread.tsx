"use client";

/**
 * CommentThread — full CRUD: display, add, reply, edit, delete
 * Connects to /api/v1/posts/[slug]/comments (primary) and
 *             /api/v1/comments/[commentId] (edit / delete)
 */

import { useState, useTransition, useCallback } from "react";
import type { Comment } from "@/lib/types";
import {
  User,
  CornerDownRight,
  Pencil,
  Trash2,
  Check,
  X,
  MessageSquare,
  Send,
  LogIn,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/app/context/AuthContext";
import { useLanguage } from "@/app/context/LanguageContext";
import { apiFetch } from "@/lib/api-fetch";
import { formatLocalizedDateTime } from "@/lib/formatting";
import { MarkdownDocument } from "@/components/markdown-document";

// ─── API helpers ─────────────────────────────────────────────────────────────

async function apiPost(url: string, body: unknown) {
  const res = await apiFetch(url, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message ?? "");
  return json?.data;
}

async function apiPatch(url: string, body: unknown) {
  const res = await apiFetch(url, {
    method:  "PATCH",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message ?? "");
  return json?.data;
}

async function apiDelete(url: string) {
  const res = await apiFetch(url, { method: "DELETE" });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json?.error?.message ?? "");
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Avatar({ name, isReply }: { name: string; isReply?: boolean }) {
  return (
    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
      isReply
        ? "bg-[var(--color-accent-violet-subtle)] text-[var(--color-accent-violet)]"
        : "bg-[var(--color-primary-subtle)] text-[var(--color-primary-hover)]"
    }`}>
      {name?.charAt(0)?.toUpperCase() ?? <User className="w-3.5 h-3.5" />}
    </div>
  );
}

interface CommentInputProps {
  placeholder?: string;
  onSubmit: (body: string) => Promise<void>;
  onCancel?: () => void;
  autoFocus?: boolean;
  submitTestId?: string;
}

function CommentInput({
  placeholder,
  onSubmit,
  onCancel,
  autoFocus,
  submitTestId,
}: CommentInputProps) {
  const { t } = useLanguage();
  const [body, setBody]         = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [isPending, start]      = useTransition();

  function submitBody() {
    const text = body.trim();
    if (!text) return;
    setError(null);
    start(async () => {
      try {
        await onSubmit(text);
        setBody("");
      } catch (err) {
        setError(err instanceof Error && err.message ? err.message : t("comments.submit_failed", "Unable to submit right now."))
      }
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitBody();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder ?? t("comments.write", "Write a comment")}
        rows={3}
        autoFocus={autoFocus}
        maxLength={2000}
        className="input-base resize-none text-sm py-2.5"
        disabled={isPending}
      />
      {error && <p className="text-xs text-[var(--color-error)]">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={isPending || !body.trim()}
          data-testid={submitTestId}
          onClick={submitBody}
          className="btn btn-primary text-xs px-4 py-1.5 flex items-center gap-1.5 disabled:opacity-40"
        >
          <Send className="w-3 h-3" />
          {isPending ? t("comments.posting", "Posting…") : t("comments.post", "Post")}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-ghost text-xs px-3 py-1.5"
          >
            {t("common.cancel", "Cancel")}
          </button>
        )}
        <span className="text-[10px] text-[var(--color-text-muted)] ml-auto">
          {body.length}/2000
        </span>
      </div>
    </form>
  );
}

// ─── Single comment card ─────────────────────────────────────────────────────

interface CommentCardProps {
  comment: Comment;
  postSlug: string;
  currentUserId: string | null;
  currentUserRole: string | null;
  onReplyAdded: (parentId: string, reply: Comment) => void;
  onEdited:     (id: string, newBody: string) => void;
  onDeleted:    (id: string, parentId?: string) => void;
  isReply?: boolean;
  depth?: number;
}

function CommentCard({
  comment, postSlug, currentUserId, currentUserRole,
  onReplyAdded, onEdited, onDeleted,
  isReply = false, depth = 0,
}: CommentCardProps) {
  const { language, t } = useLanguage();
  const [showReply, setShowReply]   = useState(false);
  const [editing, setEditing]       = useState(false);
  const [editBody, setEditBody]     = useState(comment.body);
  const [confirmDelete, setConfirm] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [isPending, start]          = useTransition();

  const isAuthor = currentUserId === comment.authorId;
  const isAdmin  = currentUserRole === "admin";
  const canEdit  = isAuthor;
  const canDelete = isAuthor || isAdmin;

  const date = formatLocalizedDateTime(comment.createdAt, language, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  async function handleReply(body: string) {
    const data = await apiPost(`/api/v1/posts/${postSlug}/comments`, {
      body,
      parentCommentId: comment.id,
    });
    const newComment = data?.comment ?? data;
    onReplyAdded(comment.id, newComment);
    setShowReply(false);
  }

  async function handleEdit() {
    const text = editBody.trim();
    if (!text || text === comment.body) { setEditing(false); return; }
    setError(null);
    start(async () => {
      try {
        await apiPatch(`/api/v1/comments/${comment.id}`, { body: text });
        onEdited(comment.id, text);
        setEditing(false);
      } catch (err) {
        setError(err instanceof Error && err.message ? err.message : t("comments.edit_failed", "Unable to save your edit right now."));
      }
    });
  }

  async function handleDelete() {
    setError(null);
    start(async () => {
      try {
        await apiDelete(`/api/v1/comments/${comment.id}`);
        onDeleted(comment.id, comment.parentCommentId);
        setConfirm(false);
      } catch (err) {
        setError(err instanceof Error && err.message ? err.message : t("comments.delete_failed", "Unable to delete this comment right now."));
        setConfirm(false);
      }
    });
  }

  return (
    <div className={`${isReply ? "ml-8 mt-3" : "mt-4 first:mt-0"}`}>
      <div
        data-testid={`comment-card-${comment.id}`}
        className={`relative card p-4 group transition-all ${isReply ? "border-l-2 border-l-[var(--color-accent-violet)] rounded-l-none" : ""}`}
      >

        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Avatar name={comment.authorName} isReply={isReply} />
            <div>
              <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                {comment.authorName}
              </span>
              <span className="text-[10px] text-[var(--color-text-muted)] ml-2">{date}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            {!isReply && depth < 1 && (
              <button
                onClick={() => setShowReply((v) => !v)}
                data-testid={`comment-reply-${comment.id}`}
                className="p-1.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-primary-hover)] hover:bg-[var(--color-primary-subtle)] transition-colors"
                title={t("comments.reply", "Reply")}
              >
                <CornerDownRight className="w-3.5 h-3.5" />
              </button>
            )}
            {canEdit && (
              <button
                onClick={() => { setEditing(true); setEditBody(comment.body); }}
                data-testid={`comment-edit-${comment.id}`}
                className="p-1.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-accent-cyan)] hover:bg-[var(--color-accent-cyan-subtle)] transition-colors"
                title={t("comments.edit", "Edit")}
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            {canDelete && !confirmDelete && (
              <button
                onClick={() => setConfirm(true)}
                data-testid={`comment-delete-${comment.id}`}
                className="p-1.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-error)] hover:bg-[var(--color-error-subtle)] transition-colors"
                title={t("comments.delete", "Delete")}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Edit mode */}
        {editing ? (
          <div className="space-y-2">
            <textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              data-testid={`comment-edit-input-${comment.id}`}
              rows={3}
              maxLength={2000}
              autoFocus
              className="input-base resize-none text-sm py-2"
              disabled={isPending}
            />
            {error && <p className="text-xs text-[var(--color-error)]">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleEdit}
                disabled={isPending}
                data-testid={`comment-save-${comment.id}`}
                className="btn btn-primary text-xs px-3 py-1.5 flex items-center gap-1 disabled:opacity-40"
              >
                <Check className="w-3 h-3" />
                {isPending ? t("comments.saving", "Saving…") : t("common.save", "Save")}
              </button>
              <button onClick={() => setEditing(false)} className="btn btn-ghost text-xs px-3 py-1.5">
                <X className="w-3 h-3" /> {t("common.cancel", "Cancel")}
              </button>
            </div>
          </div>
        ) : (
          <MarkdownDocument
            markdown={comment.body}
            className="markdown-body text-sm text-[var(--color-text-secondary)] [&_p:first-child]:mt-0 [&_p:last-child]:mb-0"
          />
        )}

        {/* Delete confirm */}
        {confirmDelete && (
          <div className="mt-2 p-3 bg-[var(--color-error-subtle)] border border-[var(--color-error-border)] rounded-[var(--radius-md)] flex items-center gap-2">
            <p className="text-xs text-[var(--color-error)] flex-1">{t("comments.delete_confirm", "Delete this comment?")}</p>
            <button
              onClick={handleDelete}
              disabled={isPending}
              data-testid={`comment-confirm-delete-${comment.id}`}
              className="btn text-xs px-3 py-1 bg-[var(--color-error)] text-[var(--color-on-accent)] disabled:opacity-40"
            >
              {isPending ? "…" : t("comments.delete", "Delete")}
            </button>
            <button onClick={() => setConfirm(false)} className="btn btn-ghost text-xs px-2 py-1">
              {t("common.cancel", "Cancel")}
            </button>
          </div>
        )}

        {error && !editing && !confirmDelete && (
          <p className="text-xs text-[var(--color-error)] mt-1">{error}</p>
        )}
      </div>

      {/* Reply input */}
      {showReply && (
        <div className="ml-8 mt-3">
          <CommentInput
            placeholder={t("comments.write_reply", "Write a reply")}
            onSubmit={handleReply}
            onCancel={() => setShowReply(false)}
            autoFocus
            submitTestId={`comment-submit-reply-${comment.id}`}
          />
        </div>
      )}

      {/* Nested replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-4">
          {comment.replies.map((reply) => (
            <CommentCard
              key={reply.id}
              comment={reply}
              postSlug={postSlug}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              onReplyAdded={onReplyAdded}
              onEdited={onEdited}
              onDeleted={onDeleted}
              isReply
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function CommentThread({
  comments: initial,
  postSlug,
}: {
  comments: Comment[];
  /** slug of the post — used for the /api/v1/posts/[slug]/comments endpoint */
  postSlug: string;
}) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>(initial);

  const addRoot = useCallback(async (body: string) => {
    const data = await apiPost(`/api/v1/posts/${postSlug}/comments`, { body });
    const newComment = data?.comment ?? data;
    setComments((prev) => [...prev, newComment]);
  }, [postSlug]);

  const onReplyAdded = useCallback((parentId: string, reply: Comment) => {
    setComments((prev) =>
      prev.map((c) =>
        c.id === parentId
          ? { ...c, replies: [...(c.replies ?? []), reply] }
          : c
      )
    );
  }, []);

  const onEdited = useCallback((id: string, newBody: string) => {
    setComments((prev) =>
      prev.map((c) => {
        if (c.id === id) return { ...c, body: newBody };
        if (c.replies) {
          return {
            ...c,
            replies: c.replies.map((r) => (r.id === id ? { ...r, body: newBody } : r)),
          };
        }
        return c;
      })
    );
  }, []);

  const onDeleted = useCallback((id: string, parentId?: string) => {
    if (parentId) {
      setComments((prev) =>
        prev.map((c) =>
          c.id === parentId
            ? { ...c, replies: (c.replies ?? []).filter((r) => r.id !== id) }
            : c
        )
      );
    } else {
      setComments((prev) => prev.filter((c) => c.id !== id));
    }
  }, []);

  return (
    <div className="space-y-1">
      {/* Comment list */}
      {comments.length === 0 ? (
        <div className="card p-10 text-center">
          <MessageSquare className="w-8 h-8 text-[var(--color-text-muted)] mx-auto mb-3 opacity-50" />
          <p className="text-sm text-[var(--color-text-secondary)]">
            {t("comments.empty", "No comments yet. Start the conversation.")}
          </p>
        </div>
      ) : (
        comments.map((comment) => (
          <CommentCard
            key={comment.id}
            comment={comment}
            postSlug={postSlug}
            currentUserId={user?.id ?? null}
            currentUserRole={user?.role ?? null}
            onReplyAdded={onReplyAdded}
            onEdited={onEdited}
            onDeleted={onDeleted}
          />
        ))
      )}

      {/* New comment input */}
      <div className="pt-6 border-t border-[var(--color-border)] mt-6">
        {user ? (
          <div className="flex items-start gap-3">
            <Avatar name={user.name} />
            <div className="flex-1">
              <CommentInput
                placeholder={t("comments.add", "Add a comment")}
                onSubmit={addRoot}
                submitTestId="comment-submit-root"
              />
            </div>
          </div>
        ) : (
          <div className="card p-5 text-center flex flex-col items-center gap-3">
            <LogIn className="w-5 h-5 text-[var(--color-text-muted)]" />
            <p className="text-sm text-[var(--color-text-secondary)]">
              <Link href="/login" className="text-[var(--color-primary-hover)] hover:underline font-medium">
                {t("auth.sign_in", "Sign in")}
              </Link>{" "}
              {t("comments.sign_in_hint", "to join the discussion.")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
