"use client";

import Link from "next/link";
import { useCallback, useMemo } from "react";
import { MessageSquarePlus, RefreshCw } from "lucide-react";
import { PostCard } from "@/components/post-card";
import { useInfinitePageAppend } from "@/hooks/use-infinite-page-append";
import { useLanguage } from "@/app/context/LanguageContext";
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
  /** Pre-computed string href for switching to classic pagination. */
  classicHref: string;
}

export function DiscussionsPostFeed({
  sort,
  authorId,
  limit,
  initialItems,
  initialPagination,
  classicHref,
}: DiscussionsPostFeedProps) {
  const { t } = useLanguage();

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
        signal: AbortSignal.timeout(15_000),
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
    const sep = classicHref.includes("?") ? "&" : "?";
    return `${classicHref}${sep}pagination=1`;
  }, [classicHref]);

  // P2-UX-1: Empty state
  if (items.length === 0 && !loading && !error) {
    return (
      <div className="card p-12 text-center space-y-4">
        <MessageSquarePlus className="w-10 h-10 text-[var(--color-text-muted)] mx-auto opacity-60" />
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
          {t("feed.empty_discussions_title")}
        </h3>
        <p className="text-xs text-[var(--color-text-secondary)] max-w-xs mx-auto">
          {t("feed.empty_discussions_desc")}
        </p>
        <Link href="/discussions/new" className="btn btn-primary text-xs px-4 py-2 inline-block">
          {t("feed.empty_discussions_cta")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        aria-live="polite"
        aria-relevant="additions"
      >
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
        <div className="flex flex-col items-center gap-2" role="alert">
          <p className="text-sm text-center text-[var(--color-error)]">
            {t("feed.error_load_failed")}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn btn-secondary text-xs px-4 py-1.5 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3 h-3" />
            {t("feed.error_retry")}
          </button>
        </div>
      )}

      <div ref={sentinelRef} className="h-4 w-full" aria-hidden="true" />

      <div className="flex flex-col items-center gap-3 pt-2">
        {loading && (
          <p className="text-xs text-[var(--color-text-muted)]" aria-live="polite">
            {t("feed.loading_more")}
          </p>
        )}
        {!hasMore && items.length > 0 && (
          <p className="text-xs text-[var(--color-text-muted)] m-0">{t("feed.end_of_results")}</p>
        )}
        <Link
          href={paginationModeHref}
          className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] underline underline-offset-2"
        >
          {t("feed.prefer_pagination")}
        </Link>
      </div>
    </div>
  );
}
