import { notFound } from "next/navigation";
import Link from "next/link";
import { getPostBySlug, listCommentsForPost, listPosts } from "@/lib/repository";
import { Clock, ArrowLeft, Star, MessageSquare, Hash, TrendingUp, BookOpen } from "lucide-react";
import { CommentThread } from "@/components/comment-thread";
import { PostSocialActions } from "@/components/post-social-actions";
import { ReportButton } from "@/components/report-button";

interface Props {
  params: Promise<{ slug: string }>;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 7) return `${d} days ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

export default async function DiscussionDetailPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) notFound();

  const [{ items: comments, pagination }, related] = await Promise.all([
    listCommentsForPost({ postId: post.id, page: 1, limit: 50 }),
    post.tags.length > 0
      ? listPosts({ tag: post.tags[0], page: 1, limit: 5 })
      : Promise.resolve({ items: [] }),
  ]);

  const relatedPosts = related.items.filter((p) => p.id !== post.id).slice(0, 4);

  const date = new Date(post.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <main className="container max-w-5xl pb-24 pt-6">

      {/* Back */}
      <Link
        href="/discussions"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Discussions
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* Article + Comments */}
        <div className="lg:col-span-8">

          {/* Article */}
          <article className="card p-6 md:p-8 mb-8 relative overflow-hidden">
            {post.featuredAt && (
              <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-featured-subtle)] rounded-full blur-[60px] translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            )}

            <div className="relative z-10">
              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-5">
                {post.featuredAt && (
                  <span className="tag tag-yellow flex items-center gap-1">
                    <Star className="w-2.5 h-2.5" />
                    Featured
                  </span>
                )}
                {post.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/discussions?sort=recent&tag=${encodeURIComponent(tag)}`}
                    className="tag hover:opacity-80 transition-opacity"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>

              {/* Title */}
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--color-text-primary)] mb-5 leading-snug">
                {post.title}
              </h1>

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--color-text-secondary)] mb-8 pb-6 border-b border-[var(--color-border)]">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--color-primary-subtle)] to-[var(--color-accent-cyan-subtle)] flex items-center justify-center text-xs font-semibold text-[var(--color-primary-hover)]">
                    {post.authorName?.charAt(0)?.toUpperCase() ?? "A"}
                  </span>
                  <span className="font-medium text-[var(--color-text-primary)]">
                    {post.authorName ?? post.authorId}
                  </span>
                </div>
                <span className="text-[var(--color-text-muted)]">·</span>
                <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                  <Clock className="w-3.5 h-3.5" />
                  {date}
                  <span className="ml-1 text-[var(--color-text-muted)]/60">({relativeTime(post.createdAt)})</span>
                </span>
                <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                  <MessageSquare className="w-3.5 h-3.5" />
                  {pagination.total} comment{pagination.total !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Body */}
              <div className="text-sm text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-wrap max-w-none">
                {post.body}
              </div>

              {/* Social actions */}
              <div className="mt-6 pt-5 border-t border-[var(--color-border-subtle)] flex items-center justify-between">
                <PostSocialActions
                  postSlug={post.slug}
                  likeCount={post.likeCount}
                  bookmarkCount={post.bookmarkCount}
                  viewerHasLiked={post.viewerHasLiked}
                  viewerHasBookmarked={post.viewerHasBookmarked}
                />
                <ReportButton targetType="post" targetId={post.id} />
              </div>
            </div>
          </article>

          {/* Comments */}
          <section id="comments" className="scroll-mt-20">
            <div className="flex items-center gap-2.5 mb-5">
              <MessageSquare className="w-4 h-4 text-[var(--color-accent-cyan)]" />
              <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                Comments
              </h2>
              <span className="tag">{pagination.total}</span>
            </div>
            <CommentThread comments={comments} postSlug={post.slug} />
          </section>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-20">

          {/* Tags browser */}
          {post.tags.length > 0 && (
            <aside className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Hash className="w-4 h-4 text-[var(--color-primary-hover)]" />
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Browse Tags</h3>
              </div>
              <div className="tag-row">
                {post.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/discussions?sort=hot&tag=${encodeURIComponent(tag)}`}
                    className="tag hover:opacity-80 transition-opacity"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            </aside>
          )}

          {/* Related discussions */}
          {relatedPosts.length > 0 && (
            <aside className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-[var(--color-accent-cyan)]" />
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Related Discussions</h3>
              </div>
              <div className="space-y-3">
                {relatedPosts.map((p) => (
                  <Link
                    key={p.id}
                    href={`/discussions/${p.slug}`}
                    className="block group"
                  >
                    <p className="text-xs font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-primary-hover)] transition-colors line-clamp-2">
                      {p.title}
                    </p>
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                      {p.authorName ?? p.authorId} · {relativeTime(p.createdAt)}
                    </p>
                  </Link>
                ))}
              </div>
            </aside>
          )}

          {/* MCP queryable */}
          <aside className="card p-5 bg-[var(--color-bg-elevated)]">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-3.5 h-3.5 text-[var(--color-accent-cyan)]" />
              <span className="text-xs font-semibold text-[var(--color-text-primary)]">Agent Readable</span>
            </div>
            <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">
              This discussion is queryable via <code className="text-[var(--color-accent-cyan)]">get_post_detail</code> in MCP v2.
            </p>
            <a
              href="/api/v1/mcp/v2/manifest"
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-[var(--color-accent-cyan)] hover:underline mt-1 block"
            >
              View MCP manifest →
            </a>
          </aside>
        </div>
      </div>
    </main>
  );
}
