import { unifiedSearch } from "@/lib/repository";
import Link from "next/link";
import { Search, Hash, Box, User, Briefcase } from "lucide-react";
import { SearchHighlight } from "@/components/search-highlight";
import { Button, EmptyState, PageHeader, Badge } from "@/components/ui";
import { getServerTranslator } from "@/lib/i18n";

const RESULT_TITLE_LINK_CLASS =
  "text-base font-semibold tracking-tight text-[var(--color-text-primary)] hover:text-[var(--color-accent-apple)] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--color-bg-canvas)] rounded-[var(--radius-sm)]";

interface Props {
  searchParams: Promise<{ q?: string; type?: string }>;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  project: <Briefcase className="w-4 h-4" aria-hidden="true" />,
  creator: <User className="w-4 h-4" aria-hidden="true" />,
};

export default async function SearchPage({ searchParams }: Props) {
  const { t } = await getServerTranslator();
  const { q = "", type } = await searchParams;
  const validTypes = ["project", "creator"] as const;
  type SearchType = (typeof validTypes)[number];
  const resolvedType = validTypes.includes(type as SearchType) ? (type as SearchType) : undefined;

  const qTrim = q.trim();
  const results = qTrim.length >= 2 ? (await unifiedSearch(qTrim, resolvedType)).filter((item) => item.type !== "post") : [];
  const typeLabels: Record<SearchType, string> = {
    project: t("search.type_project", "Project"),
    creator: t("search.type_creator", "Creator"),
  };
  const subtitle =
    qTrim.length >= 2
      ? t("search.results_subtitle", "Found {count} results for “{query}”.")
          .replace("{count}", String(results.length))
          .replace("{query}", qTrim)
      : qTrim.length > 0
        ? t("search.min_query_page", "Type at least 2 characters to search. Matches are highlighted in results.")
        : t("search.page_hint", "使用全局搜索快速找到项目与创作者。");

  return (
    <main className="container pb-24 pt-8 space-y-6">
      <PageHeader
        icon={Search}
        title={t("search.page_title", "Search")}
        subtitle={subtitle}
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
                <Box className="w-3.5 h-3.5" aria-hidden="true" /> {t("search.type_all", "All")}
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
                  {TYPE_ICONS[t]} {typeLabels[t]}
                </Link>
              ))}
            </div>
          ) : undefined
        }
      />

      {qTrim.length === 0 ? (
        <EmptyState
          icon={Search}
          title={t("search.empty_title", "Search the platform")}
          description={t("search.empty_description", "使用全局搜索快速找到项目与创作者，或直接进入发现页开始浏览。")}
          action={
            <Link href="/discover">
              <Button variant="primary" size="sm">
                {t("search.empty_cta_projects", "发现项目")}
              </Button>
            </Link>
          }
          block
        />
      ) : qTrim.length < 2 ? (
        <EmptyState
          icon={Search}
          title={t("search.keep_typing_title", "Keep typing")}
          description={t("search.keep_typing_description", "Short queries are noisy. Add one more character.")}
          block
        />
      ) : results.length === 0 ? (
        <EmptyState
          icon={Search}
          title={t("search.no_results_title", "No results")}
          description={t("search.no_results_page", "We couldn’t find anything matching “{query}”. Try another keyword or clear the type filter.").replace("{query}", qTrim)}
          action={
            <Link href="/discover">
              <Button variant="primary" size="sm">
                {t("search.empty_cta_projects", "Discover projects")}
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
                <Badge variant="default" pill mono size="sm">
                  {TYPE_ICONS[item.type]} {typeLabels[item.type as SearchType]}
                </Badge>
                <Link
                  href={item.type === "creator" ? `/u/${item.slug}` : `/p/${item.slug}`}
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
                    <Badge key={tag} variant="default" pill mono size="sm">
                      <Hash className="w-3 h-3" aria-hidden="true" /> {tag}
                    </Badge>
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
