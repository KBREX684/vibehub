"use client";

import Link from "next/link";
import { useCallback, useMemo } from "react";
import { FolderOpen, RefreshCw } from "lucide-react";
import { ProjectCard } from "@/components/project-card";
import { useInfinitePageAppend } from "@/hooks/use-infinite-page-append";
import { useLanguage } from "@/app/context/LanguageContext";
import type { Project } from "@/lib/types";

export interface DiscoverProjectFeedProps {
  filters: {
    query?: string;
    tag?: string;
    tech?: string;
    team?: string;
    status?: string;
    limit: number;
  };
  initialItems: Project[];
  initialPagination: {
    total: number;
    totalPages: number;
    page: number;
    limit: number;
  };
  buildPageHref: (page: number) => string;
}

export function DiscoverProjectFeed({
  filters,
  initialItems,
  initialPagination,
  buildPageHref,
}: DiscoverProjectFeedProps) {
  const { t } = useLanguage();

  const qsBase = useMemo(() => {
    const sp = new URLSearchParams();
    if (filters.query) sp.set("query", filters.query);
    if (filters.tag) sp.set("tag", filters.tag);
    if (filters.tech) sp.set("tech", filters.tech);
    if (filters.team) sp.set("team", filters.team);
    if (filters.status) sp.set("status", filters.status);
    sp.set("limit", String(filters.limit));
    return sp;
  }, [filters]);

  const paginationModeHref = useMemo(() => {
    const base = buildPageHref(1);
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}pagination=1`;
  }, [buildPageHref]);

  const fetchPage = useCallback(
    async (page: number) => {
      const sp = new URLSearchParams(qsBase);
      sp.set("page", String(page));
      const res = await fetch(`/api/v1/public/projects?${sp.toString()}`, {
        credentials: "same-origin",
        signal: AbortSignal.timeout(15_000),
      });
      const json = (await res.json()) as {
        data?: { items: Project[]; pagination: typeof initialPagination };
        error?: { message?: string };
      };
      if (!res.ok || !json.data?.items || !json.data.pagination) {
        throw new Error(json.error?.message ?? "Failed to load projects");
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

  // P2-UX-1: Empty state
  if (items.length === 0 && !loading && !error) {
    return (
      <div className="card p-12 text-center space-y-4">
        <FolderOpen className="w-10 h-10 text-[var(--color-text-muted)] mx-auto opacity-60" />
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
          {t("feed.empty_projects_title")}
        </h3>
        <p className="text-xs text-[var(--color-text-secondary)] max-w-xs mx-auto">
          {t("feed.empty_projects_desc")}
        </p>
        <Link href="/projects/new" className="btn btn-primary text-xs px-4 py-2 inline-block">
          {t("feed.empty_projects_cta")}
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
        {items.map((project) => (
          <ProjectCard key={project.id} project={project} />
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
