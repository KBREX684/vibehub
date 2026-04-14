"use client";

import { useState } from "react";
import { Heart, Bookmark, Share2 } from "lucide-react";

interface Props {
  postSlug: string;
  likeCount: number;
  bookmarkCount: number;
  viewerHasLiked?: boolean;
  viewerHasBookmarked?: boolean;
}

export function PostSocialActions({
  postSlug,
  likeCount: initialLikeCount,
  bookmarkCount: initialBookmarkCount,
  viewerHasLiked: initialLiked = false,
  viewerHasBookmarked: initialBookmarked = false,
}: Props) {
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [bookmarkCount, setBookmarkCount] = useState(initialBookmarkCount);
  const [loading, setLoading] = useState<"like" | "bookmark" | null>(null);
  const [copied, setCopied] = useState(false);

  async function toggleLike() {
    if (loading) return;
    setLoading("like");
    try {
      const res = await fetch(`/api/v1/posts/${postSlug}/like`, { method: "POST" });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        const toggled = data?.data?.liked ?? !liked;
        setLiked(toggled);
        setLikeCount((c) => toggled ? c + 1 : Math.max(0, c - 1));
      }
    } catch {
      // silent
    } finally {
      setLoading(null);
    }
  }

  async function toggleBookmark() {
    if (loading) return;
    setLoading("bookmark");
    try {
      const res = await fetch(`/api/v1/posts/${postSlug}/bookmark`, { method: "POST" });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        const toggled = data?.data?.bookmarked ?? !bookmarked;
        setBookmarked(toggled);
        setBookmarkCount((c) => toggled ? c + 1 : Math.max(0, c - 1));
      }
    } catch {
      // silent
    } finally {
      setLoading(null);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // silent
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={toggleLike}
        disabled={loading === "like"}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-pill)] text-xs font-medium transition-all border ${
          liked
            ? "bg-[var(--color-warning-subtle)] text-[var(--color-warning)] border-[rgba(245,158,11,0.3)]"
            : "text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-[rgba(245,158,11,0.3)] hover:text-[var(--color-warning)] hover:bg-[var(--color-warning-subtle)]"
        } disabled:opacity-50`}
        aria-label={liked ? "Unlike" : "Like"}
      >
        <Heart className={`w-3.5 h-3.5 ${liked ? "fill-current" : ""}`} />
        {likeCount > 0 && <span>{likeCount}</span>}
        <span>{liked ? "Liked" : "Like"}</span>
      </button>

      <button
        onClick={toggleBookmark}
        disabled={loading === "bookmark"}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-pill)] text-xs font-medium transition-all border ${
          bookmarked
            ? "bg-[var(--color-primary-subtle)] text-[var(--color-primary-hover)] border-[rgba(99,102,241,0.3)]"
            : "text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-[rgba(99,102,241,0.3)] hover:text-[var(--color-primary-hover)] hover:bg-[var(--color-primary-subtle)]"
        } disabled:opacity-50`}
        aria-label={bookmarked ? "Remove bookmark" : "Bookmark"}
      >
        <Bookmark className={`w-3.5 h-3.5 ${bookmarked ? "fill-current" : ""}`} />
        {bookmarkCount > 0 && <span>{bookmarkCount}</span>}
        <span>{bookmarked ? "Saved" : "Save"}</span>
      </button>

      <button
        onClick={copyLink}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-pill)] text-xs font-medium text-[var(--color-text-muted)] border border-[var(--color-border)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)] transition-all"
        aria-label="Copy link"
      >
        <Share2 className="w-3.5 h-3.5" />
        <span>{copied ? "Copied!" : "Share"}</span>
      </button>
    </div>
  );
}
