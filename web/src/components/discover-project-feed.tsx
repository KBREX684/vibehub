"use client";

import Link from "next/link";
import { useCallback, useMemo } from "react";
import { useLanguage } from "@/app/context/LanguageContext";
import { ProjectCard } from "@/components/project-card";
import { useInfinitePageAppend } from "@/hooks/use-infinite-page-append";
import type { Project } from "@/lib/types";

export interface DiscoverProjectFeedProps {
  filters: {
    query?: string;
    tag?: string;
    tech?: string;
    team?: string;
    status?: string;
    sort?: string;
    limit: number;
  };
  initialItems: Project[];
  initialPagination: {
    total: number;
    totalPages: number;
    page: number;
    limit: number;
  };
  paginationModeHref: string;
}

export function DiscoverProjectFeed({
  filters,
  initialItems,
  initialPagination,
  paginationModeHref,
}: DiscoverProjectFeedProps) {
  const { t } = useLanguage();
  const qsBase = useMemo(() => {
    const sp = new URLSearchParams();
    if (filters.query) sp.set("query", filters.query);
    if (filters.tag) sp.set("tag", filters.tag);
    if (filters.tech) sp.set("tech", filters.tech);
    if (filters.team) sp.set("team", filters.team);
    if (filters.status) sp.set("status", filters.status);
    if (filters.sort) sp.set("sort", filters.sort);
    sp.set("limit", String(filters.limit));
    return sp;
  }, [filters]);

  const fetchPage = useCallback(
    async (page: number) => {
      const sp = new URLSearchParams(qsBase);
      sp.set("page", String(page));
      const res = await fetch(`/api/v1/public/projects?${sp.toString()}`, {
        credentials: "same-origin",
      });
      const json = (await res.json()) as {
        data?: { items: Project[]; pagination: typeof initialPagination };
        error?: { message?: string };
      };
      if (!res.ok || !json.data?.items || !json.data.pagination) {
        throw new Error(json.error?.message ?? t("discover.load_failed", "Failed to load projects"));
      }
      return {
        items: json.data.items,
        pagination: json.data.pagination,
      };
    },
    [qsBase, t]
  );

  const { items, loading, error, hasMore, sentinelRef } = useInfinitePageAppend({
    initialItems,
    initialPagination,
    fetchPage,
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((project) => (
          <ProjectCard key={project.id} project={project} />
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
          <p className="text-xs text-[var(--color-text-muted)]">{t("discover.loading_more", "Loading more…")}</p>
        )}
        {!hasMore && items.length > 0 && (
          <p className="text-xs text-[var(--color-text-muted)] m-0">{t("discover.end_of_results", "End of results")}</p>
        )}
        <Link
          href={paginationModeHref}
          className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] underline underline-offset-2"
        >
          {t("discover.page_navigation", "Prefer page-by-page navigation?")}
        </Link>
      </div>
    </div>
  );
}
