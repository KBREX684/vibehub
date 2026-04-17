"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";

interface Props {
  projectSlug: string;
  initialBookmarked: boolean;
  initialCount: number;
  loginHref: string;
  isAuthenticated: boolean;
}

export function ProjectBookmarkButton({
  projectSlug,
  initialBookmarked,
  initialCount,
  loginHref,
  isAuthenticated,
}: Props) {
  const [interactive, setInteractive] = useState(false);
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setInteractive(true);
  }, []);

  async function toggle() {
    if (loading) return;
    setLoading(true);
    const prevBookmarked = bookmarked;
    const prevCount = count;
    const nextBookmarked = !prevBookmarked;
    setBookmarked(nextBookmarked);
    setCount(Math.max(0, prevCount + (nextBookmarked ? 1 : -1)));
    try {
      const response = await apiFetch(`/api/v1/projects/${encodeURIComponent(projectSlug)}/bookmark`, {
        method: "POST",
        credentials: "include",
      });
      const json = (await response.json().catch(() => ({}))) as {
        data?: { bookmarked?: boolean; bookmarkCount?: number };
      };
      if (!response.ok) {
        setBookmarked(prevBookmarked);
        setCount(prevCount);
        return;
      }
      if (typeof json.data?.bookmarked === "boolean") {
        setBookmarked(json.data.bookmarked);
      }
      if (typeof json.data?.bookmarkCount === "number") {
        setCount(json.data.bookmarkCount);
      }
    } catch {
      setBookmarked(prevBookmarked);
      setCount(prevCount);
    } finally {
      setLoading(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <Link href={loginHref} className="btn btn-secondary text-sm px-4 py-2 flex items-center gap-1.5">
        <Bookmark className="w-3.5 h-3.5" />
        Save
      </Link>
    );
  }

  return (
    <button
      type="button"
      className="btn btn-secondary text-sm px-4 py-2 flex items-center gap-1.5"
      onClick={() => void toggle()}
      disabled={!interactive || loading}
      aria-pressed={bookmarked}
      aria-label={bookmarked ? "Remove bookmark" : "Save project"}
    >
      <Bookmark className={`w-3.5 h-3.5 ${bookmarked ? "fill-current" : ""}`} />
      {bookmarked ? "Saved" : "Save"}
      <span className="text-xs text-[var(--color-text-muted)]">{count}</span>
    </button>
  );
}
