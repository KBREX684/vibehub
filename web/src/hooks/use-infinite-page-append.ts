"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface PageAppendPagination {
  total: number;
  totalPages: number;
  page: number;
  limit: number;
}

export interface PageAppendResult<T> {
  items: T[];
  pagination: PageAppendPagination;
}

/**
 * Append subsequent pages when the sentinel intersects (infinite scroll).
 * Uses numeric page + limit (works with FTS and all sort modes).
 */
export function useInfinitePageAppend<T extends { id: string }>(options: {
  initialItems: T[];
  initialPagination: PageAppendPagination;
  fetchPage: (page: number) => Promise<PageAppendResult<T>>;
  /** Pixels below the viewport to start loading (smoother UX) */
  rootMargin?: string;
}) {
  const { initialItems, initialPagination, fetchPage, rootMargin = "240px 0px" } = options;

  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(initialPagination.page);
  const [totalPages, setTotalPages] = useState(initialPagination.totalPages);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPageRef = useRef(fetchPage);
  fetchPageRef.current = fetchPage;

  const pageRef = useRef(initialPagination.page);
  const totalPagesRef = useRef(initialPagination.totalPages);
  const loadingRef = useRef(false);

  useEffect(() => {
    setItems(initialItems);
    const p = initialPagination.page;
    const tp = initialPagination.totalPages;
    setPage(p);
    setTotalPages(tp);
    pageRef.current = p;
    totalPagesRef.current = tp;
    setError(null);
  }, [initialItems, initialPagination.page, initialPagination.totalPages]);

  const loadMore = useCallback(async () => {
    if (loadingRef.current) return;
    const curPage = pageRef.current;
    const maxPages = totalPagesRef.current;
    if (curPage >= maxPages) return;

    loadingRef.current = true;
    setLoading(true);
    setError(null);
    const nextPage = curPage + 1;
    try {
      const { items: newItems, pagination } = await fetchPageRef.current(nextPage);
      setItems((prev) => {
        const seen = new Set(prev.map((i) => i.id));
        const merged = [...prev];
        for (const it of newItems) {
          if (!seen.has(it.id)) {
            merged.push(it);
            seen.add(it.id);
          }
        }
        return merged;
      });
      pageRef.current = pagination.page;
      totalPagesRef.current = pagination.totalPages;
      setPage(pagination.page);
      setTotalPages(pagination.totalPages);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  const loadMoreRef = useRef(loadMore);
  loadMoreRef.current = loadMore;

  const hasMore = page < totalPages;

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting) return;
        void loadMoreRef.current();
      },
      { root: null, rootMargin, threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);

  return { items, loading, error, hasMore, page, totalPages, sentinelRef };
}
