"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, Briefcase, MessageSquare, User, CornerDownLeft } from "lucide-react";
import { SearchHighlight } from "@/components/search-highlight";
import type { SearchResult } from "@/lib/types";

const OPEN_EVENT = "vibehub-open-command-palette";
const MIN_QUERY_LENGTH = 2;

type SearchSection = {
  key: SearchResult["type"];
  label: string;
  icon: typeof Briefcase;
};

const SECTIONS: SearchSection[] = [
  { key: "project", label: "Projects", icon: Briefcase },
  { key: "post", label: "Discussions", icon: MessageSquare },
  { key: "creator", label: "Creators", icon: User },
];

export function openCommandPalette() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(OPEN_EVENT));
  }
}

function hrefForResult(result: SearchResult) {
  if (result.type === "post") return `/discussions/${result.slug}`;
  if (result.type === "creator") return `/creators/${result.slug}`;
  return `/projects/${result.slug}`;
}

export function CommandPalette() {
  const router = useRouter();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      const isShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (!isShortcut) return;
      event.preventDefault();
      setOpen(true);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onShortcut);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onShortcut);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!open || debouncedQuery.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setLoading(false);
      setError(null);
      setSelectedIndex(0);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    void fetch(`/api/v1/search?q=${encodeURIComponent(debouncedQuery)}&limit=12`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const json = (await response.json()) as {
          data?: { results?: SearchResult[] };
          error?: { message?: string };
        };
        if (!response.ok) {
          throw new Error(json.error?.message ?? "Search failed");
        }
        setResults(json.data?.results ?? []);
        setSelectedIndex(0);
      })
      .catch((err) => {
        if ((err as Error).name === "AbortError") return;
        setResults([]);
        setError(err instanceof Error ? err.message : "Search failed");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [debouncedQuery, open]);

  const groupedResults = useMemo(() => {
    return SECTIONS.map((section) => ({
      ...section,
      items: results.filter((item) => item.type === section.key),
    })).filter((section) => section.items.length > 0);
  }, [results]);

  const flattenedResults = useMemo(
    () => groupedResults.flatMap((section) => section.items),
    [groupedResults]
  );

  const closePalette = () => {
    setOpen(false);
    setError(null);
  };

  const navigateToResult = (result: SearchResult) => {
    closePalette();
    router.push(hrefForResult(result));
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closePalette();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (flattenedResults.length > 0) {
        setSelectedIndex((index) => (index + 1) % flattenedResults.length);
      }
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (flattenedResults.length > 0) {
        setSelectedIndex((index) => (index - 1 + flattenedResults.length) % flattenedResults.length);
      }
      return;
    }
    if (event.key === "Enter" && flattenedResults[selectedIndex]) {
      event.preventDefault();
      navigateToResult(flattenedResults[selectedIndex]);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center px-4 py-20">
      <button
        type="button"
        aria-label="Close search"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closePalette}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Global search"
        className="relative w-full max-w-2xl overflow-hidden rounded-[24px] border border-[var(--color-border-strong)] bg-[var(--color-bg-elevated)] shadow-[var(--shadow-modal)]"
      >
        <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-3">
          <Search className="h-4 w-4 text-[var(--color-text-muted)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search projects, discussions, creators..."
            className="w-full bg-transparent text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]"
          />
          <kbd className="rounded border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-2 py-1 text-[10px] text-[var(--color-text-muted)]">
            Esc
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {debouncedQuery.length < MIN_QUERY_LENGTH ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-[var(--color-text-secondary)]">
                Type at least {MIN_QUERY_LENGTH} characters to search.
              </p>
              <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                Tip: use <span className="font-mono">⌘K</span> / <span className="font-mono">Ctrl+K</span> anywhere.
              </p>
            </div>
          ) : loading ? (
            <div className="px-5 py-10 text-center text-sm text-[var(--color-text-secondary)]">
              Searching...
            </div>
          ) : error ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-[var(--color-error)]">{error}</p>
            </div>
          ) : groupedResults.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-[var(--color-text-secondary)]">
              No results for “{debouncedQuery}”.
            </div>
          ) : (
            groupedResults.map((section) => {
              const Icon = section.icon;
              return (
                <section key={section.key} className="border-b border-[var(--color-border)] last:border-b-0">
                  <div className="flex items-center gap-2 px-4 py-3 text-xs font-mono uppercase tracking-wider text-[var(--color-text-muted)]">
                    <Icon className="h-3.5 w-3.5" />
                    {section.label}
                  </div>
                  <ul className="pb-2">
                    {section.items.map((item) => {
                      const index = flattenedResults.findIndex(
                        (candidate) => candidate.type === item.type && candidate.id === item.id
                      );
                      const active = index === selectedIndex;
                      return (
                        <li key={`${item.type}-${item.id}`}>
                          <button
                            type="button"
                            onMouseEnter={() => setSelectedIndex(index)}
                            onClick={() => navigateToResult(item)}
                            className={`flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-colors ${
                              active
                                ? "bg-[var(--color-bg-surface)] text-[var(--color-text-primary)]"
                                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface)]"
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium text-[var(--color-text-primary)]">
                                <SearchHighlight text={item.title} query={debouncedQuery} />
                              </div>
                              <div className="mt-1 line-clamp-2 text-xs text-[var(--color-text-secondary)]">
                                <SearchHighlight text={item.excerpt} query={debouncedQuery} />
                              </div>
                            </div>
                            {active && <CornerDownLeft className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
