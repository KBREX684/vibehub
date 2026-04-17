import { unifiedSearch } from "@/lib/repository";
import Link from "next/link";
import { Search, Hash, Box, User, Briefcase, MessageSquare } from "lucide-react";
import { SearchHighlight } from "@/components/search-highlight";
import { Button, EmptyState, PageHeader, TagPill } from "@/components/ui";

const RESULT_TITLE_LINK_CLASS =
  "text-base font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-accent-apple)] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-apple)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--color-bg-canvas)] rounded-[var(--radius-sm)]";

interface Props {
  searchParams: Promise<{ q?: string; type?: string }>;
}

const TYPE_LABELS: Record<string, string> = {
  post: "Discussion",
  project: "Project",
  creator: "Creator",
};
const TYPE_ICONS: Record<string, React.ReactNode> = {
  post: <MessageSquare className="w-4 h-4" aria-hidden="true" />,
  project: <Briefcase className="w-4 h-4" aria-hidden="true" />,
  creator: <User className="w-4 h-4" aria-hidden="true" />,
};

export default async function SearchPage({ searchParams }: Props) {
  const { q = "", type } = await searchParams;
  const validTypes = ["post", "project", "creator"] as const;
  type SearchType = (typeof validTypes)[number];
  const resolvedType = validTypes.includes(type as SearchType) ? (type as SearchType) : undefined;

  const qTrim = q.trim();
  const results = qTrim.length >= 2 ? await unifiedSearch(qTrim, resolvedType) : [];

  return (
    <main className="container pb-24 pt-8 space-y-6">
      <PageHeader
        icon={Search}
        title="Search"
        subtitle={
          qTrim.length >= 2
            ? `Found ${results.length} result${results.length === 1 ? "" : "s"} for \u201c${qTrim}\u201d`
            : qTrim.length > 0
              ? "Type at least 2 characters to search. Matches are highlighted in results."
              : "Use the header search (⌘K on desktop). Results cover discussions, projects and creators."
        }
        actions={
          qTrim.length >= 2 ? (
            <div className="inline-flex p-1 rounded-[var(--radius-pill)] bg-[var(--color-bg-surface)] border border-[var(--color-border)]">
              <Link
                href={`/search?q=${encodeURIComponent(qTrim)}`}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-[var(--radius-pill)] transition-colors ${
                  !resolvedType
                    ? "bg-[var(--color-bg-elevated)] border border-[var(--color-border-strong)] text-[var(--color-text-primary)]"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)]"
                }`}
                aria-current={!resolvedType ? "page" : undefined}
              >
                <Box className="w-3.5 h-3.5" aria-hidden="true" /> All
              </Link>
              {validTypes.map((t) => (
                <Link
                  key={t}
                  href={`/search?q=${encodeURIComponent(qTrim)}&type=${t}`}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-[var(--radius-pill)] transition-colors ${
                    resolvedType === t
                      ? "bg-[var(--color-bg-elevated)] border border-[var(--color-border-strong)] text-[var(--color-text-primary)]"
                      : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)]"
                  }`}
                  aria-current={resolvedType === t ? "page" : undefined}
                >
                  {TYPE_ICONS[t]} {TYPE_LABELS[t]}
                </Link>
              ))}
            </div>
          ) : undefined
        }
      />

      {qTrim.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Search the platform"
          description="Open the global search (⌘K on desktop), or jump to Discover or Discussions from the nav."
          action={
            <div className="flex gap-2 justify-center">
              <Link href="/discover">
                <Button variant="primary" size="sm">
                  Discover projects
                </Button>
              </Link>
              <Link href="/discussions">
                <Button variant="secondary" size="sm">
                  Browse discussions
                </Button>
              </Link>
            </div>
          }
          block
        />
      ) : qTrim.length < 2 ? (
        <EmptyState
          icon={Search}
          title="Keep typing"
          description="Short queries are noisy. Add one more character."
          block
        />
      ) : results.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No results"
          description={`We couldn’t find anything matching “${qTrim}”. Try another keyword or clear the type filter.`}
          action={
            <Link href="/discover">
              <Button variant="primary" size="sm">
                Browse Discover
              </Button>
            </Link>
          }
          block
        />
      ) : (
        <div className="grid gap-3 max-w-4xl mx-auto">
          {results.map((item) => (
            <article key={`${item.type}-${item.id}`} className="card p-5 space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <TagPill accent="default" size="sm">
                  {TYPE_ICONS[item.type]} {TYPE_LABELS[item.type]}
                </TagPill>
                <Link
                  href={`/${item.type === "post" ? "discussions" : item.type === "creator" ? "creators" : "projects"}/${item.slug}`}
                  className={RESULT_TITLE_LINK_CLASS}
                >
                  <SearchHighlight text={item.title} query={qTrim} />
                </Link>
              </div>

              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed m-0">
                <SearchHighlight text={item.excerpt} query={qTrim} />
              </p>

              {item.tags && item.tags.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-3 border-t border-[var(--color-border-subtle)]">
                  {item.tags.slice(0, 5).map((tag) => (
                    <TagPill key={tag} accent="default" size="sm" mono>
                      <Hash className="w-3 h-3" aria-hidden="true" /> {tag}
                    </TagPill>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
