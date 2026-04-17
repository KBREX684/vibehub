"use client";

import { useState } from "react";
import { Heart, Bookmark, Share2 } from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";

const SOCIAL_LINK_BTN_CLASS =
  "flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-pill)] text-xs font-medium text-[var(--color-text-muted)] border border-[var(--color-border)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)] transition-all";

interface Props {
  postSlug: string;
  likeCount: number;
  bookmarkCount: number;
  viewerHasLiked?: boolean;
  viewerHasBookmarked?: boolean;
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 6000) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await apiFetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
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
  const [likeLoading, setLikeLoading] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function toggleLike() {
    if (likeLoading) return;
    const prevLiked = liked;
    const prevCount = likeCount;
    const nextLiked = !prevLiked;
    setLiked(nextLiked);
    setLikeCount((c) => (nextLiked ? c + 1 : Math.max(0, c - 1)));
    setLikeLoading(true);
    try {
      const res = await fetchWithTimeout(`/api/v1/posts/${postSlug}/like`, { method: "POST" });
      if (!res.ok) {
        setLiked(prevLiked);
        setLikeCount(prevCount);
        return;
      }
      const data = await res.json().catch(() => null);
      if (data?.data) {
        if (typeof data.data.liked === "boolean") setLiked(data.data.liked);
        if (typeof data.data.likeCount === "number") setLikeCount(data.data.likeCount);
      }
    } catch {
      setLiked(prevLiked);
      setLikeCount(prevCount);
    } finally {
      setLikeLoading(false);
    }
  }

  async function toggleBookmark() {
    if (bookmarkLoading) return;
    const prevBookmarked = bookmarked;
    const prevCount = bookmarkCount;
    const nextBookmarked = !prevBookmarked;
    setBookmarked(nextBookmarked);
    setBookmarkCount((c) => (nextBookmarked ? c + 1 : Math.max(0, c - 1)));
    setBookmarkLoading(true);
    try {
      const res = await fetchWithTimeout(`/api/v1/posts/${postSlug}/bookmark`, { method: "POST" });
      if (!res.ok) {
        setBookmarked(prevBookmarked);
        setBookmarkCount(prevCount);
        return;
      }
      const data = await res.json().catch(() => null);
      if (data?.data) {
        if (typeof data.data.bookmarked === "boolean") setBookmarked(data.data.bookmarked);
        if (typeof data.data.bookmarkCount === "number") setBookmarkCount(data.data.bookmarkCount);
      }
    } catch {
      setBookmarked(prevBookmarked);
      setBookmarkCount(prevCount);
    } finally {
      setBookmarkLoading(false);
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
        type="button"
        onClick={toggleLike}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-pill)] text-xs font-medium transition-all border ${
          liked
            ? "bg-[var(--color-warning-subtle)] text-[var(--color-warning)] border-[rgba(245,158,11,0.3)]"
            : "text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-[rgba(245,158,11,0.3)] hover:text-[var(--color-warning)] hover:bg-[var(--color-warning-subtle)]"
        } disabled:opacity-50`}
        aria-label={liked ? "Unlike" : "Like"}
        aria-pressed={liked}
        aria-busy={likeLoading}
      >
        <Heart className={`w-3.5 h-3.5 ${liked ? "fill-current" : ""}`} />
        {likeCount > 0 && <span aria-hidden>{likeCount}</span>}
        <span>{liked ? "Liked" : "Like"}</span>
      </button>

      <button
        type="button"
        onClick={toggleBookmark}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-pill)] text-xs font-medium transition-all border ${
          bookmarked
            ? "bg-[var(--color-primary-subtle)] text-[var(--color-primary-hover)] border-[rgba(99,102,241,0.3)]"
            : "text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-[rgba(99,102,241,0.3)] hover:text-[var(--color-primary-hover)] hover:bg-[var(--color-primary-subtle)]"
        } disabled:opacity-50`}
        aria-label={bookmarked ? "Remove bookmark" : "Bookmark"}
        aria-pressed={bookmarked}
        aria-busy={bookmarkLoading}
      >
        <Bookmark className={`w-3.5 h-3.5 ${bookmarked ? "fill-current" : ""}`} />
        {bookmarkCount > 0 && <span aria-hidden>{bookmarkCount}</span>}
        <span>{bookmarked ? "Saved" : "Save"}</span>
      </button>

      <button
        type="button"
        onClick={copyLink}
        className={SOCIAL_LINK_BTN_CLASS}
        aria-label="Copy link"
      >
        <Share2 className="w-3.5 h-3.5" />
        <span>{copied ? "Copied!" : "Share"}</span>
      </button>
    </div>
  );
}
