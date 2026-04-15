"use client";

import Link from "next/link";
import { useCallback, useMemo } from "react";
import { PostCard } from "@/components/post-card";
import { useInfinitePageAppend } from "@/hooks/use-infinite-page-append";
import type { Post, PostSortOrder } from "@/lib/types";

export interface DiscussionsPostFeedProps {
  sort: PostSortOrder;
  authorId?: string;
  limit: number;
  initialItems: Post[];
  initialPagination: {
    total: number;
    totalPages: number;
    page: number;
    limit: number;
  };
  buildClassicHref: () => string;
}

export function DiscussionsPostFeed({
  sort,
  authorId,
  limit,
  initialItems,
  initialPagination,
  buildClassicHref,
}: DiscussionsPostFeedProps) {
  const qsBase = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set("sort", sort);
    if (authorId) sp.set("author", authorId);
    sp.set("limit", String(limit));
    return sp;
  }, [sort, authorId, limit]);

  const fetchPage = useCallback(
    async (page: number) => {
      const sp = new URLSearchParams(qsBase);
      sp.set("page", String(page));
      const res = await fetch(`/api/v1/posts?${sp.toString()}`, {
        credentials: "include",
      });
      const json = (await res.json()) as {
        data?: { items: Post[]; pagination: typeof initialPagination };
        error?: { message?: string };
      };
      if (!res.ok || !json.data?.items || !json.data.pagination) {
        throw new Error(json.error?.message ?? "Failed to load discussions");
      }
      return {
        items: json.data.items,
        pagination: json.data.pagination,
      };
    },
    [qsBase]
  );

  const { items, loading, error, hasMore, sentinelRef } = useInfinitePageAppend({
    initialItems,
    initialPagination,
    fetchPage,
  });

  const paginationModeHref = useMemo(() => {
    const base = buildClassicHref();
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}pagination=1`;
  }, [buildClassicHref]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            truncateBody={160}
            detailHref={`/discussions/${post.slug}`}
          />
        ))}
      </div>

      {error && (
        <p className="text-sm text-center text-[var(--color-error)]" role="alert">
          {error}
        </p>
      )}

      <div ref={sentinelRef} className="h-4 w-full" aria-hidden="true" />

      <div className="flex flex-col items-center gap-3 pt-2">
        {loading && (
          <p className="text-xs text-[var(--color-text-muted)]">Loading more…</p>
        )}
        {!hasMore && items.length > 0 && (
          <p className="text-xs text-[var(--color-text-muted)] m-0">End of results</p>
        )}
        <Link
          href={paginationModeHref}
          className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] underline underline-offset-2"
        >
          Prefer page-by-page navigation?
        </Link>
      </div>
    </div>
  );
}
