import Link from "next/link";
import { PostCard } from "@/components/post-card";
import { DiscussionsPostFeed } from "@/components/discussions-post-feed";
import { getFollowFeed, getRecommendedPostFeed, listPosts } from "@/lib/repository";
import { getSessionUserFromCookie } from "@/lib/auth";
import type { PostSortOrder } from "@/lib/types";
import { getServerTranslator } from "@/lib/i18n";
import {
  MessageSquare,
  Flame,
  Clock,
  Plus,
  Users,
  Sparkles,
  ArrowRight,
} from "lucide-react";

interface Props {
  searchParams: Promise<{ sort?: string; page?: string; author?: string; pagination?: string }>;
}

function buildDiscussionsHref(opts: {
  sort: PostSortOrder;
  authorId?: string;
  page?: number;
  classicPagination: boolean;
}): string {
  const sp = new URLSearchParams();
  sp.set("sort", opts.sort);
  if (opts.authorId) sp.set("author", opts.authorId);
  if (opts.page && opts.page > 1) sp.set("page", String(opts.page));
  if (opts.classicPagination) sp.set("pagination", "1");
  return `/discussions?${sp.toString()}`;
}

export default async function DiscussionsPage({ searchParams }: Props) {
  const params = await searchParams;
  const { t } = await getServerTranslator();
  const sort = (
    ["recent", "hot", "following", "recommended", "featured"].includes(params.sort || "")
      ? params.sort
      : "recent"
  ) as PostSortOrder;
  const page = parseInt(params.page || "1", 10) || 1;
  const authorId = typeof params.author === "string" && params.author.trim() ? params.author.trim() : undefined;
  const classicPagination = params.pagination === "1";
  const session = await getSessionUserFromCookie();
  const personalizedFeed = sort === "following" || sort === "recommended";
  const feedResult = sort === "following"
    ? await getFollowFeed(session?.userId ?? "", { page, limit: 12 })
    : sort === "recommended"
      ? await getRecommendedPostFeed(session?.userId ?? null, { page, limit: 12 })
      : await listPosts({ sort, page, limit: 12, authorId });
  const { items, pagination } = feedResult;

  const TABS = [
    { sort: "recent" as const, icon: Clock, label: t("discussions.sort_recent", "Recent") },
    { sort: "hot" as const, icon: Flame, label: t("discussions.sort_hot", "Hot") },
    { sort: "following" as const, icon: Users, label: t("discussions.sort_following", "Following") },
    { sort: "recommended" as const, icon: Sparkles, label: t("discussions.sort_recommended", "Recommended") },
  ];
  const FEED_META: Record<PostSortOrder, { description: string; emptyTitle: string; emptyBody: string }> = {
    recent: {
      description: t("discussions.feed_recent_description", "Latest approved threads across the square."),
      emptyTitle: t("discussions.feed_recent_empty_title", "No recent discussions"),
      emptyBody: t("discussions.feed_recent_empty_body", "No approved threads have been published yet."),
    },
    hot: {
      description: t("discussions.feed_hot_description", "Momentum ranking using likes, comments, bookmarks, and recency decay."),
      emptyTitle: t("discussions.feed_hot_empty_title", "Nothing is trending yet"),
      emptyBody: t("discussions.feed_hot_empty_body", "Hot picks appear here once discussions start collecting real engagement."),
    },
    following: {
      description: t("discussions.feed_following_description", "Only creators you follow, ordered by newest activity."),
      emptyTitle: t("discussions.feed_following_empty_title", "Your following feed is empty"),
      emptyBody: t("discussions.feed_following_empty_body", "Follow creators from profile pages and their latest posts will show up here."),
    },
    recommended: {
      description: t("discussions.feed_recommended_description", "Interest-based recommendations from your recent interaction graph. No LLM ranking."),
      emptyTitle: t("discussions.feed_recommended_empty_title", "No recommendations yet"),
      emptyBody: t("discussions.feed_recommended_empty_body", "Like, bookmark, or author a few posts first and this feed will become personalized."),
    },
    featured: {
      description: t("discussions.feed_featured_description", "Editorially featured discussions."),
      emptyTitle: t("discussions.feed_featured_empty_title", "No featured discussions yet"),
      emptyBody: t("discussions.feed_featured_empty_body", "Featured discussions appear here after review."),
    },
  };
  const activeMeta = FEED_META[sort];

  return (
    <main className="container pb-24 space-y-8 pt-8">

      {/* Page header */}
      <section className="page-hero flex flex-col sm:flex-row sm:items-center justify-between gap-5 pb-6 border-b border-[var(--color-border)] animate-fade-in-up">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-[var(--radius-xl)] bg-[var(--color-accent-cyan-subtle)] flex items-center justify-center text-[var(--color-accent-cyan)]">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)] mb-0.5">
              Discussions
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {pagination.total} active threads
              {authorId
                ? ` · ${t("discussions.filtered_by_author", "Filtered by author")}`
                : personalizedFeed
                  ? ` · ${t("discussions.personalized_view", "Personalized view")}`
                  : ` · ${t("discussions.default_subtitle", "Share knowledge, ask questions")}`}
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1 mb-0">
              {activeMeta.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Sort tabs */}
          <div className="inline-flex p-1 rounded-[var(--radius-pill)] bg-[var(--color-bg-surface)] border border-[var(--color-border)]">
            {TABS.map(({ sort: s, icon: Icon, label }) => (
              <Link
                key={s}
                href={buildDiscussionsHref({ sort: s, authorId, classicPagination })}
                scroll={false}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-[var(--radius-pill)] transition-all ${
                  sort === s
                    ? "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] shadow-sm border border-[var(--color-border)]"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </Link>
            ))}
          </div>

          <Link
            href="/discussions/new"
            className="btn btn-primary text-sm px-4 py-1.5 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            {t("discussions.new_cta", "New discussion")}
          </Link>
        </div>
      </section>

      {personalizedFeed && !session ? (
        <div className="card p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)] m-0">
              {t("discussions.personalized_signin_title", "Sign in to unlock personalized feeds")}
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1 mb-0">
              {t("discussions.personalized_signin_body", "Following shows creators you follow. Recommended uses your own activity and saved interests.")}
            </p>
          </div>
          <Link href={`/login?redirect=${encodeURIComponent(`/discussions?sort=${sort}`)}`} className="btn btn-primary text-sm px-4 py-2 inline-flex items-center gap-1.5">
            {t("common.sign_in", "Sign in")}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : null}

      {/* Results */}
      {items.length === 0 ? (
        <div className="card p-16 text-center">
          <MessageSquare className="w-10 h-10 text-[var(--color-text-muted)] mx-auto mb-4 opacity-50" />
          <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-2">
            {activeMeta.emptyTitle}
          </h3>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {activeMeta.emptyBody}
          </p>
        </div>
      ) : classicPagination ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-grid">
            {items.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                detailHref={`/discussions/${post.slug}`}
              />
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <nav className="flex justify-center gap-2 mt-8" aria-label="Pagination">
              {page > 1 && (
                <Link
                  href={buildDiscussionsHref({ sort, authorId, page: page - 1, classicPagination: true })}
                  className="btn btn-secondary text-sm px-5 py-2"
                >
                  {t("common.previous", "Previous")}
                </Link>
              )}
              <span className="btn btn-ghost text-sm px-4 py-2 text-[var(--color-text-muted)]">
                {page} / {pagination.totalPages}
              </span>
              {page < pagination.totalPages && (
                <Link
                  href={buildDiscussionsHref({ sort, authorId, page: page + 1, classicPagination: true })}
                  className="btn btn-secondary text-sm px-5 py-2"
                >
                  {t("common.next", "Next")}
                </Link>
              )}
            </nav>
          )}
        </>
      ) : (
        <DiscussionsPostFeed
          sort={sort}
          authorId={authorId}
          limit={12}
          initialItems={items}
          initialPagination={{
            total: pagination.total,
            totalPages: pagination.totalPages,
            page: pagination.page,
            limit: pagination.limit,
          }}
          classicHref={buildDiscussionsHref({ sort, authorId, classicPagination: true })}
        />
      )}
    </main>
  );
}
