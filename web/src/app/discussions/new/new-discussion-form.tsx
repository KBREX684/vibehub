"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, Plus, X } from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";
import { DiscussionBodyField } from "./discussion-body-field";

export function NewDiscussionForm() {
  const router = useRouter();
  const [title, setTitle]   = useState("");
  const [body, setBody]     = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags]     = useState<string[]>([]);
  const [error, setError]   = useState<string | null>(null);
  const [isPending, start]  = useTransition();

  function addTag() {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
    if (t && !tags.includes(t) && tags.length < 5) {
      setTags((prev) => [...prev, t]);
    }
    setTagInput("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      try {
        const res = await apiFetch("/api/v1/posts", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ title, body, tags }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error?.message ?? "Failed to create post");
        const slug = json?.data?.post?.slug ?? json?.data?.slug;
        if (slug) router.push(`/discussions/${slug}`);
        else router.push("/discussions");
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-5">
      {/* Title */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
          Title <span className="text-[var(--color-error)]">*</span>
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input-base"
          placeholder="What do you want to discuss?"
          maxLength={200}
          required
          minLength={5}
        />
        <p className="text-[10px] text-[var(--color-text-muted)]">{title.length}/200</p>
      </div>

      <DiscussionBodyField body={body} onChange={setBody} />

      {/* Tags */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
          Tags (max 5)
        </label>
        <div className="flex items-center gap-2">
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); }}}
            className="input-base flex-1"
            placeholder="e.g. nextjs"
            maxLength={32}
          />
          <button
            type="button"
            onClick={addTag}
            className="btn btn-secondary text-xs px-3 py-2"
            disabled={tags.length >= 5}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {tags.map((t) => (
              <span key={t} className="tag flex items-center gap-1">
                #{t}
                <button
                  type="button"
                  onClick={() => setTags((prev) => prev.filter((x) => x !== t))}
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-error)] transition-colors"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="px-3 py-2 bg-[var(--color-error-subtle)] border border-[rgba(239,68,68,0.2)] rounded-[var(--radius-md)] text-xs text-[var(--color-error)]">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2 border-t border-[var(--color-border-subtle)]">
        <button
          type="submit"
          disabled={isPending || !title.trim() || !body.trim()}
          className="btn btn-primary text-sm px-6 py-2.5 flex items-center gap-2 disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
          {isPending ? "Submitting…" : "Submit for Review"}
        </button>
        <button
          type="button"
          onClick={() => window.history.back()}
          className="btn btn-ghost text-sm px-4 py-2.5"
        >
          Cancel
        </button>
      </div>
      <p className="text-[10px] text-[var(--color-text-muted)]">
        Posts enter a moderation queue before appearing publicly.
      </p>
    </form>
  );
}
